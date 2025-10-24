import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { supabase, Message, Profile } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations';

export default function MessagesPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialContactId = searchParams.get('to');
  
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  useEffect(() => {
    if (!user || !profile) {
      navigate('/login');
      return;
    }
    
    const fetchMessageData = async () => {
      setLoading(true);
      try {
        console.log('Fetching message data');
        
        // First try to fetch real data
        let hasRealData = false;
        
        // Fetch contacts based on role
        let contactsData: Profile[] = [];
        
        if (profile.role === 'student') {
          // For students, fetch tutors of enrolled classes
          const { data: enrollments, error: enrollmentsError } = await supabase
            .from('enrollments')
            .select('class_id')
            .eq('student_id', user.id)
            .eq('status', 'active');
            
          if (enrollmentsError) {
            console.error('Error fetching enrollments:', enrollmentsError);
          } else if (enrollments && enrollments.length > 0) {
            hasRealData = true;
            const classIds = enrollments.map(e => e.class_id);
            
            // Fetch classes to get tutor IDs
            const { data: classes, error: classesError } = await supabase
              .from('classes')
              .select('tutor_id')
              .in('id', classIds);
              
            if (classesError) {
              console.error('Error fetching classes:', classesError);
            } else if (classes && classes.length > 0) {
              // Get unique tutor IDs
              const tutorIds = [...new Set(classes.map(c => c.tutor_id))];
              
              // Fetch tutor profiles
              const { data: tutors, error: tutorsError } = await supabase
                .from('profiles')
                .select('*')
                .in('user_id', tutorIds);
                
              if (tutorsError) {
                console.error('Error fetching tutor profiles:', tutorsError);
              } else {
                contactsData = tutors || [];
              }
            }
          }
        } else if (profile.role === 'tutor') {
          // For tutors, fetch students of their classes
          const { data: tutorClasses, error: classesError } = await supabase
            .from('classes')
            .select('id')
            .eq('tutor_id', user.id);
            
          if (classesError) {
            console.error('Error fetching tutor classes:', classesError);
          } else if (tutorClasses && tutorClasses.length > 0) {
            hasRealData = true;
            const classIds = tutorClasses.map(c => c.id);
            
            // Fetch enrollments to get student IDs
            const { data: enrollments, error: enrollmentsError } = await supabase
              .from('enrollments')
              .select('student_id')
              .in('class_id', classIds)
              .eq('status', 'active');
              
            if (enrollmentsError) {
              console.error('Error fetching enrollments:', enrollmentsError);
            } else if (enrollments && enrollments.length > 0) {
              // Get unique student IDs
              const studentIds = [...new Set(enrollments.map(e => e.student_id))];
              
              // Fetch student profiles
              const { data: students, error: studentsError } = await supabase
                .from('profiles')
                .select('*')
                .in('user_id', studentIds);
                
              if (studentsError) {
                console.error('Error fetching student profiles:', studentsError);
              } else {
                contactsData = students || [];
              }
            }
          }
        }
        
        // If initialContactId is provided, find that contact
        let initialContact: Profile | null = null;
        if (initialContactId && contactsData.length > 0) {
          initialContact = contactsData.find(c => c.user_id === initialContactId) || null;
        }
        
        // Only use real data, no mock data
        if (!hasRealData) {
          console.log('No contacts found in the database.');
          // Just use empty contacts array
          contactsData = [];
        }
        
        setContacts(contactsData);
        
        // Set selected contact
        if (initialContact) {
          setSelectedContact(initialContact);
          await fetchMessages(initialContact.user_id);
        } else if (contactsData.length > 0) {
          setSelectedContact(contactsData[0]);
          await fetchMessages(contactsData[0].user_id);
        }
      } catch (error) {
        console.error('Error fetching message data:', error);
        toast.error('Failed to load messages');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessageData();
  }, [user, profile, navigate, initialContactId]);
  
  const fetchMessages = async (contactId: string) => {
    if (!user) return;
    
    try {
      // Fetch messages between current user and contact
      const { data: sentMessages, error: sentError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', user.id)
        .eq('recipient_id', contactId)
        .order('created_at', { ascending: true });
        
      if (sentError) {
        console.error('Error fetching sent messages:', sentError);
      }
      
      const { data: receivedMessages, error: receivedError } = await supabase
        .from('messages')
        .select('*')
        .eq('sender_id', contactId)
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: true });
        
      if (receivedError) {
        console.error('Error fetching received messages:', receivedError);
      }
      
      // Combine and sort messages
      const allMessages = [
        ...(sentMessages || []),
        ...(receivedMessages || [])
      ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      // No mock messages, only use real messages
      setMessages(allMessages || []);
      
      // Mark received messages as read
      if (receivedMessages && receivedMessages.length > 0) {
        const unreadIds = receivedMessages
          .filter(msg => !msg.read)
          .map(msg => msg.id);
          
        if (unreadIds.length > 0) {
          await supabase
            .from('messages')
            .update({ read: true })
            .in('id', unreadIds);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  
  const handleContactSelect = async (contact: Profile) => {
    setSelectedContact(contact);
    await fetchMessages(contact.user_id);
  };
  
  const handleSendMessage = async () => {
    if (!user || !selectedContact || !messageInput.trim()) return;
    
    try {
      setSending(true);
      
      const newMessage = {
        sender_id: user.id,
        recipient_id: selectedContact.user_id,
        content: messageInput.trim(),
        read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('messages')
        .insert(newMessage);
        
      if (error) {
        console.error('Error sending message:', error);
        toast.error('Failed to send message');
        return;
      }
      
      // Add message to state
      setMessages([...messages, { ...newMessage, id: Date.now().toString() }]);
      
      // Clear input
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('An error occurred while sending your message');
    } finally {
      setSending(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
        <p className="ml-3 text-sky-100">Loading messages...</p>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="container mx-auto p-4"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      <motion.h1 variants={fadeUp} className="text-3xl font-bold mb-6 text-white">Messages</motion.h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-10rem)]">
        <motion.div variants={fadeUp}>
        <Card className="md:col-span-1 flex flex-col overflow-hidden bg-blue-900/60 border-blue-700/60">
          <CardHeader>
            <CardTitle className="text-lg text-white">Contacts</CardTitle>
            <CardDescription className="text-sky-100/70">Your conversations</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {contacts.length > 0 ? (
                <div className="px-4">
                  {contacts.map((contact) => (
                    <div key={contact.user_id}>
                      <button
                        className={`flex items-center w-full p-3 rounded-md hover:bg-sky-500/10 transition-colors ${selectedContact?.user_id === contact.user_id ? 'bg-sky-500/20' : ''}`}
                        onClick={() => handleContactSelect(contact)}
                      >
                        <Avatar className="h-10 w-10 mr-3 border-2 border-sky-500/30">
                          <AvatarImage src={contact.avatar_url || undefined} />
                          <AvatarFallback className="bg-blue-900 text-sky-300">
                            {contact.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-white">{contact.full_name}</p>
                          <p className="text-sm text-sky-100/70">{contact.role}</p>
                        </div>
                      </button>
                      <Separator className="my-2 bg-blue-700/30" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sky-100/70">No contacts found</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        </motion.div>
        
        <motion.div variants={fadeUp}>
        <Card className="md:col-span-2 flex flex-col overflow-hidden bg-blue-900/60 border-blue-700/60">
          {selectedContact ? (
            <>
              <CardHeader className="border-b border-blue-700/60">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3 border-2 border-sky-500/30">
                    <AvatarImage src={selectedContact.avatar_url || undefined} />
                    <AvatarFallback className="bg-blue-900 text-sky-300">
                      {selectedContact.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-white">{selectedContact.full_name}</CardTitle>
                    <CardDescription className="text-sky-100/70">{selectedContact.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <ScrollArea className="h-[calc(100vh-20rem)]">
                  <div className="flex flex-col p-4 space-y-4">
                    {messages.map((message) => {
                      const isCurrentUser = message.sender_id === user?.id;
                      return (
                        <div 
                          key={message.id}
                          className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          <div 
                            className={`max-w-[80%] rounded-lg p-3 ${
                              isCurrentUser 
                                ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white' 
                                : 'bg-blue-900/80 border border-blue-700/60 text-sky-100'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-white/70' : 'text-sky-100/70'}`}>
                              {format(new Date(message.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-4 border-t border-blue-700/60">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type your message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="bg-blue-900/40 border-blue-700/60 text-white placeholder:text-sky-100/50"
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={sending || !messageInput.trim()}
                    className="rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400"
                  >
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-sky-100/70">Select a contact to start messaging</p>
            </div>
          )}
        </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}