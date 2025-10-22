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
        <p>Loading messages...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-10rem)]">
        <Card className="md:col-span-1 flex flex-col overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg">Contacts</CardTitle>
            <CardDescription>Your conversations</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <ScrollArea className="h-full">
              {contacts.length > 0 ? (
                <div className="px-4">
                  {contacts.map((contact) => (
                    <div key={contact.user_id}>
                      <button
                        className={`flex items-center w-full p-3 rounded-md hover:bg-muted ${selectedContact?.user_id === contact.user_id ? 'bg-muted' : ''}`}
                        onClick={() => handleContactSelect(contact)}
                      >
                        <Avatar className="h-10 w-10 mr-3">
                          <AvatarImage src={contact.avatar_url || undefined} />
                          <AvatarFallback>
                            {contact.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium">{contact.full_name}</p>
                          <p className="text-sm text-muted-foreground">{contact.role}</p>
                        </div>
                      </button>
                      <Separator className="my-2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No contacts found</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2 flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={selectedContact.avatar_url || undefined} />
                    <AvatarFallback>
                      {selectedContact.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle>{selectedContact.full_name}</CardTitle>
                    <CardDescription>{selectedContact.email}</CardDescription>
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
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}
                          >
                            <p>{message.content}</p>
                            <p className={`text-xs mt-1 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {format(new Date(message.created_at), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
              <div className="p-4 border-t">
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
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={sending || !messageInput.trim()}
                  >
                    Send
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a contact to start messaging</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}