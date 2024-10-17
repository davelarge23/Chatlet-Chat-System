import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import {
  Box,
  Button,
  Input,
  VStack,
  Text,
  Link,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Image,
  HStack
} from '@chakra-ui/react';
import { ChatIcon, CloseIcon } from '@chakra-ui/icons';

const socket = io('http://localhost:5000');

function App() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [interest, setInterest] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [room, setRoom] = useState(null);
  const [partner, setPartner] = useState('');
  const chatEndRef = useRef(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDisconnectedOpen, onOpen: onDisconnectedOpen, onClose: onDisconnectedClose } = useDisclosure();
  const cancelRef = useRef();
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    socket.on('chat message', ({ user, message }) => {
      const formattedTimestamp = formatTimestamp(); 
      console.log(`[MyApp] Message from ${user}: ${message} at ${formattedTimestamp}`);
      setMessages((prevMessages) => [...prevMessages, { user, message, timestamp: formattedTimestamp }]);
    });

    socket.on('matched', ({ room, partner }) => {
      setRoom(room);
      setPartner(partner);
    });

    socket.on('partner disconnected', () => {
      onDisconnectedOpen();
    });

    return () => {
      socket.off('chat message');
      socket.off('matched');
      socket.off('partner disconnected');
    };
  }, []);

  const formatTimestamp = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const resetChat = () => {
    setIsLoggedIn(false);
    setRoom(null);
    setMessages([]);
    setMessage('');
    setInterest('');
    setUsername('');
    onDisconnectedClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message) {
      console.log('Emitting message:', { room, message, user: username });
      socket.emit('chat message', { room, message, user: username }); 
      setMessage('');
    }
    
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    if (username && interest) {
      setIsLoggedIn(true);
      socket.emit('join', { username, interest });
    }
  };

  const handleEndChat = () => {
    socket.emit('leave room', room); // Notify server to alert partner
    resetChat(); 
    onClose(); 
  };

  return (
    <Box display="flex" alignItems="center" justifyContent="center" flexFlow={'column'} w={'100vw'} h={{base: '95vh', md: '100vh'}} bg={'#D6D6D6'} overflow={{base: 'hidden'}}>
      {!isLoggedIn ? (
        <>
          <Box p={8} w={{ base: "300px", md: "400px" }} bg="white" borderRadius="md" boxShadow="md">
            <VStack spacing={4}>
              <Text fontSize="2xl" fontWeight="bold">Chatlet: Chat System</Text>
              <Text fontSize="1xl" fontStyle={'italic'}>Chat with your same interest</Text>
              <form onSubmit={handleUsernameSubmit}>
                <VStack spacing={3}>
                  <Input
                    placeholder="Display Name..."
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required />
                  <Input
                    placeholder="Interest"
                    value={interest}
                    onChange={(e) => setInterest(e.target.value)}
                    required />
                  <Button type="submit" colorScheme="teal" width="100%">Join Chat</Button>
                </VStack>
              </form>
            </VStack>
          </Box>
          <Link color="teal.500" onClick={() => setShowAbout(true)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            About
          </Link>
        </>
      ) : (
        <Box w="100%" maxW={{base: "90vw", md: "50vw"}} h="80vh" p={5} bg="white" borderRadius="md" boxShadow="md" display={'flex'} flexFlow={'column'} gap={2}>
          {room ? (
            <>
              <Text fontWeight="bold">Chatting with {partner}</Text>
              <Box bg="gray.100" p={4} borderRadius="md" h={'100%'} overflowY="scroll" display={'flex'} flexFlow={'column'}>
                {messages.map((msg, index) => (
                  <Box
                    key={index}
                    bg={msg.user === username ? 'teal.100' : 'gray.200'}
                    color={msg.user === username ? 'black' : 'black'}
                    borderRadius="lg"
                    p={{base: 2, md: 3}}
                    m={{base: 1, md: 2}}
                    alignSelf={msg.user === username ? 'flex-end' : 'flex-start'}
                    maxWidth="80%"
                  >
                    {msg.user === 'System' ? (
                      <Text alignSelf="center" color="red.500" fontWeight="normal" fontStyle={"italic"} bg="transparent" fontSize={{base: 'smaller', md: 'sm'}}>
                        {msg.message}
                      </Text>
                    ) : (
                      <>
                        <Text fontSize={{base: 'smaller', md: 'sm'}}>{msg.message}</Text>
                        <Text fontSize={{base: '10px', md: 'sm'}} color="gray.500">{msg.timestamp}</Text>
                      </>
                    )}
                  </Box>
                ))}
                <div ref={chatEndRef} />
              </Box>
              <form onSubmit={handleSubmit}>
                <Box display={'flex'} flexFlow={'row'}>
                  <Input
                    placeholder="Type your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                  <Button type="submit" colorScheme="teal" ml={2}>
                    <ChatIcon />
                  </Button>
                </Box>
              </form>
              <Button colorScheme="red" onClick={onOpen}>
                End Chat
              </Button>
            </>
          ) : (
            <Text>Please wait for a partner...</Text>
          )}
        </Box>
      )}

      {/* About Pop-Up */}
      {showAbout && (
        <Box position="fixed" top="50%" left="50%" transform="translate(-50%, -50%)" zIndex="overlay">
          <About onClose={() => setShowAbout(false)} />
        </Box>
      )}

      {/* Confirmation Dialog for Ending Chat */}
      <AlertDialog isOpen={isOpen} onClose={onClose} leastDestructiveRef={cancelRef}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              End Chat
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure you want to end this chat?
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={handleEndChat} ml={3}>
                End Chat
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Confirmation Dialog for Disconnection */}
      <AlertDialog isOpen={isDisconnectedOpen} onClose={onDisconnectedClose} leastDestructiveRef={cancelRef}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Partner Disconnected
            </AlertDialogHeader>
            <AlertDialogBody>
              Your partner has disconnected from the chat.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button colorScheme="teal" onClick={resetChat}>
                Okay
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
  
}

const About = ({ onClose }) => {
  return (
    <Box p={4} maxW="600px" w={{base: '300px', md: '600px'} } mx="auto" bg="white" borderRadius="md" boxShadow="md" spacing>
      <VStack spacing={5}>
      <Button onClick={onClose}>
        <CloseIcon/>
      </Button>
      
      <Text size="lg" mb={4}>About Chatlet</Text>
      <Text textAlign="center">
        Chatlet is an anonymous chat application where users are matched based on shared interests. 
      </Text>
      
      <Text>Stack Used:</Text>
      <HStack>
        <Box display={"flex"} flexFlow={"column"} justifyContent={"center"} alignItems={"center"}>
          <Image src={`${process.env.PUBLIC_URL}/logo192.png`} alt='React' h={"50"}/>
          <Text>React JS</Text>
        </Box>
        <Box display={"flex"} flexFlow={"column"} justifyContent={"center"} alignItems={"center"}>
          <Image src='https://pbs.twimg.com/profile_images/1244925541448286208/rzylUjaf_400x400.jpg' alt='React' h={"50"}/>
          <Text>Chakra UI</Text>
        </Box>
        <Box display={"flex"} flexFlow={"column"} justifyContent={"center"} alignItems={"center"}>
          <Image src='https://miro.medium.com/v2/resize:fit:365/1*Jr3NFSKTfQWRUyjblBSKeg.png' h={"50"}/>
          <Text>Node + Express</Text>
        </Box>
        <Box display={"flex"} flexFlow={"column"} justifyContent={"center"} alignItems={"center"}>
          <Image src='https://socket.io/images/logo.svg' alt='React' h={"50"}/>
          <Text>Socket.IO</Text>
        </Box>
      </HStack>

      <Text textAlign={"center"}>Developed by <Text fontWeight={"bold"}>Cristhan Dave Espiritu</Text></Text>
      <Text>©2024 Chatlet, All Rights Reserved</Text>

      </VStack>
    </Box>
  );
  
};

export default App;