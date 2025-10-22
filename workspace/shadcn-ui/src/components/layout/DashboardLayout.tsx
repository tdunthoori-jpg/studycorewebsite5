import { useState, useEffect } from 'react';import { useState, useEffect } from 'react';import { useState, useEffect } from 'react';

import { Link, useNavigate, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';import { Link, useNavigate, useLocation } from 'react-router-dom';import { Link, useNavigate, useLocation } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

import {import { Button } from '@/components/ui/button';import { Button } from '@/components/ui/button';

  DropdownMenu,

  DropdownMenuContent,import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

  DropdownMenuItem,

  DropdownMenuLabel,import {import {

  DropdownMenuSeparator,

  DropdownMenuTrigger,  DropdownMenu,  DropdownMenu,

} from '@/components/ui/dropdown-menu';

import {  DropdownMenuContent,  DropdownMenuContent,

  Sheet,

  SheetContent,  DropdownMenuItem,  DropdownMenuItem,

  SheetHeader,

  SheetTitle,  DropdownMenuLabel,  DropdownMenuLabel,

  SheetTrigger,

} from '@/components/ui/sheet';  DropdownMenuSeparator,  DropdownMenuSeparator,

import { useAuth } from '@/contexts/SimpleAuthContext';

import {   DropdownMenuTrigger,  DropdownMenuTrigger,

  Menu, 

  User, } from '@/components/ui/dropdown-menu';} from '@/components/ui/dropdown-menu';

  BookOpen, 

  Calendar, import {import {

  FileText, 

  MessageSquare,   Sheet,  Sheet,

  LogOut, 

  Home,  SheetContent,  SheetContent,

  Users

} from 'lucide-react';  SheetHeader,  SheetHeader,



interface SidebarNavProps {  SheetTitle,  SheetTitle,

  links: {

    href: string;  SheetTrigger,  SheetTrigger,

    label: string;

    icon: React.ElementType;} from '@/components/ui/sheet';} from '@/components/ui/sheet';

  }[];

}import { useAuth } from '@/contexts/SimpleAuthContext';import { useAuth } from '@/contexts/SimpleAuthContext';



export function SidebarNav({ links }: SidebarNavProps) {import { import { Menu, User, BookOpen, Calendar, FileText, MessageSquare, Settings, LogOut, ChevronRight } from 'lucide-react';

  const location = useLocation();

  const currentPath = location.pathname;  Menu, 



  return (  User, interface SidebarNavProps {

    <nav className="grid gap-2 px-2">

      {links.map((link) => (  BookOpen,   links: {

        <Button

          key={link.href}  Calendar,     href: string;

          asChild

          variant={currentPath === link.href ? "default" : "ghost"}  FileText,     label: string;

          className={`justify-start ${currentPath === link.href ? "bg-primary text-primary-foreground" : ""}`}

        >  MessageSquare,     icon: React.ElementType;

          <Link to={link.href}>

            <link.icon className="mr-2 h-4 w-4" />  Settings,   }[];

            {link.label}

          </Link>  LogOut, }

        </Button>

      ))}  Home,

    </nav>

  );  Usersexport function SidebarNav({ links }: SidebarNavProps) {

}

} from 'lucide-react';  const location = useLocation();

export function DashboardLayout({ children }: { children: React.ReactNode }) {

  const { user, profile, signOut } = useAuth();  const currentPath = location.pathname;

  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);interface SidebarNavProps {



  useEffect(() => {  links: {  return (

    const checkScreenSize = () => {

      setIsMobile(window.innerWidth < 768);    href: string;    <nav className="grid gap-2 px-2">

    };

        label: string;      {links.map((link) => (

    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);    icon: React.ElementType;        <Button

    

    return () => window.removeEventListener('resize', checkScreenSize);  }[];          key={link.href}

  }, []);

}          asChild

  const studentLinks = [

    { href: "/dashboard", label: "Dashboard", icon: Home },          variant={currentPath === link.href ? "default" : "ghost"}

    { href: "/classes", label: "Classes", icon: BookOpen },

    { href: "/schedule", label: "Schedule", icon: Calendar },export function SidebarNav({ links }: SidebarNavProps) {          className={`justify-start ${currentPath === link.href ? "bg-primary text-primary-foreground" : ""}`}

    { href: "/assignments", label: "Assignments", icon: FileText },

    { href: "/messages", label: "Messages", icon: MessageSquare },  const location = useLocation();        >

    { href: "/profile", label: "Profile", icon: User },

  ];  const currentPath = location.pathname;          <Link to={link.href}>



  const tutorLinks = [            <link.icon className="mr-2 h-4 w-4" />

    { href: "/dashboard", label: "Dashboard", icon: Home },

    { href: "/classes", label: "Classes", icon: BookOpen },  return (            {link.label}

    { href: "/schedule", label: "Schedule", icon: Calendar },

    { href: "/assignments", label: "Assignments", icon: FileText },    <nav className="grid gap-2 px-2">          </Link>

    { href: "/students", label: "Students", icon: Users },

    { href: "/messages", label: "Messages", icon: MessageSquare },      {links.map((link) => (        </Button>

    { href: "/profile", label: "Profile", icon: User },

  ];        <Button      ))}



  const links = profile?.role === 'student' ? studentLinks : tutorLinks;          key={link.href}    </nav>



  const handleSignOut = async () => {          asChild  );

    try {

      await signOut();          variant={currentPath === link.href ? "default" : "ghost"}}

    } catch (error) {

      console.error('Error signing out:', error);          className={`justify-start ${currentPath === link.href ? "bg-primary text-primary-foreground" : ""}`}

    }

  };        >export function DashboardLayout({ children }: { children: React.ReactNode }) {



  if (!user || !profile) {          <Link to={link.href}>  const { user, profile, signOut } = useAuth();

    return <>{children}</>;

  }            <link.icon className="mr-2 h-4 w-4" />  const navigate = useNavigate();



  return (            {link.label}  const [isMobile, setIsMobile] = useState(false);

    <div className="flex min-h-screen bg-muted/40">

      {/* Sidebar for desktop */}          </Link>

      {!isMobile && (

        <aside className="hidden md:flex w-64 flex-col border-r bg-card">        </Button>  useEffect(() => {

          <div className="p-4 border-b">

            <Link to="/dashboard" className="flex items-center gap-2">      ))}    const checkScreenSize = () => {

              <span className="font-bold text-lg text-primary">StudyCore</span>

              <span className="text-xs px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">    </nav>      setIsMobile(window.innerWidth < 768);

                {profile.role === 'student' ? 'Student' : 'Tutor'}

              </span>  );    };

            </Link>

          </div>}    

          <div className="flex-1 py-4">

            <SidebarNav links={links} />    checkScreenSize();

          </div>

          <div className="border-t p-4">export function DashboardLayout({ children }: { children: React.ReactNode }) {    window.addEventListener('resize', checkScreenSize);

            <div className="flex items-center gap-3 mb-4">

              <Avatar className="h-8 w-8">  const { user, profile, signOut } = useAuth();    

                <AvatarImage src={profile.avatar_url || undefined} />

                <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>  const navigate = useNavigate();    return () => window.removeEventListener('resize', checkScreenSize);

              </Avatar>

              <div className="flex-1 overflow-hidden">  const [isMobile, setIsMobile] = useState(false);  }, []);

                <p className="font-medium truncate">{profile.full_name || 'User'}</p>

                <p className="text-xs text-muted-foreground truncate">{user.email}</p>

              </div>

            </div>  useEffect(() => {  const studentLinks = [

            <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">

              <LogOut className="mr-2 h-4 w-4" />    const checkScreenSize = () => {    { href: "/dashboard", label: "Dashboard", icon: BookOpen },

              Sign Out

            </Button>      setIsMobile(window.innerWidth < 768);    { href: "/schedule", label: "Schedule", icon: Calendar },

          </div>

        </aside>    };    { href: "/assignments", label: "Assignments", icon: FileText },

      )}

        { href: "/messages", label: "Messages", icon: MessageSquare },

      {/* Content */}

      <div className="flex-1 flex flex-col">    checkScreenSize();    { href: "/profile", label: "Profile", icon: User },

        {/* Header for mobile */}

        {isMobile && (    window.addEventListener('resize', checkScreenSize);    { href: "/debug", label: "Debug Tools", icon: Settings },

          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">

            <Sheet>      ];

              <SheetTrigger asChild>

                <Button variant="outline" size="icon" className="shrink-0">    return () => window.removeEventListener('resize', checkScreenSize);

                  <Menu className="h-4 w-4" />

                  <span className="sr-only">Toggle navigation menu</span>  }, []);  const tutorLinks = [

                </Button>

              </SheetTrigger>    { href: "/dashboard", label: "Dashboard", icon: BookOpen },

              <SheetContent side="left" className="flex flex-col p-0">

                <SheetHeader className="border-b p-4">  const studentLinks = [    { href: "/classes", label: "Classes", icon: BookOpen },

                  <SheetTitle>StudyCore</SheetTitle>

                </SheetHeader>    { href: "/dashboard", label: "Dashboard", icon: Home },    { href: "/schedule", label: "Schedule", icon: Calendar },

                <div className="flex-1 overflow-auto py-4">

                  <SidebarNav links={links} />    { href: "/classes", label: "Classes", icon: BookOpen },    { href: "/assignments", label: "Assignments", icon: FileText },

                </div>

                <div className="border-t p-4">    { href: "/schedule", label: "Schedule", icon: Calendar },    { href: "/students", label: "Students", icon: User },

                  <div className="flex items-center gap-3 mb-4">

                    <Avatar className="h-8 w-8">    { href: "/assignments", label: "Assignments", icon: FileText },    { href: "/messages", label: "Messages", icon: MessageSquare },

                      <AvatarImage src={profile.avatar_url || undefined} />

                      <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>    { href: "/messages", label: "Messages", icon: MessageSquare },    { href: "/profile", label: "Profile", icon: User },

                    </Avatar>

                    <div className="flex-1 overflow-hidden">    { href: "/profile", label: "Profile", icon: User },    { href: "/debug", label: "Debug Tools", icon: Settings },

                      <p className="font-medium truncate">{profile.full_name || 'User'}</p>

                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>  ];  ];

                    </div>

                  </div>

                  <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">

                    <LogOut className="mr-2 h-4 w-4" />  const tutorLinks = [  const links = profile?.role === 'student' ? studentLinks : tutorLinks;

                    Sign Out

                  </Button>    { href: "/dashboard", label: "Dashboard", icon: Home },

                </div>

              </SheetContent>    { href: "/classes", label: "Classes", icon: BookOpen },  const handleSignOut = async () => {

            </Sheet>

            <div className="flex-1">    { href: "/schedule", label: "Schedule", icon: Calendar },    try {

              <Link to="/dashboard" className="flex items-center gap-2">

                <span className="font-bold text-lg">StudyCore</span>    { href: "/assignments", label: "Assignments", icon: FileText },      await signOut();

              </Link>

            </div>    { href: "/students", label: "Students", icon: Users },    } catch (error) {

            <DropdownMenu>

              <DropdownMenuTrigger asChild>    { href: "/messages", label: "Messages", icon: MessageSquare },      console.error('Error signing out:', error);

                <Button variant="ghost" size="icon" className="rounded-full">

                  <Avatar className="h-8 w-8">    { href: "/profile", label: "Profile", icon: User },    }

                    <AvatarImage src={profile.avatar_url || undefined} />

                    <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>  ];  };

                  </Avatar>

                </Button>

              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">  const links = profile?.role === 'student' ? studentLinks : tutorLinks;  if (!user || !profile) {

                <DropdownMenuLabel>My Account</DropdownMenuLabel>

                <DropdownMenuSeparator />    return children;

                <DropdownMenuItem onClick={() => navigate('/profile')}>

                  <User className="mr-2 h-4 w-4" />  const handleSignOut = async () => {  }

                  Profile

                </DropdownMenuItem>    try {

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={handleSignOut}>      await signOut();  return (

                  <LogOut className="mr-2 h-4 w-4" />

                  Sign Out    } catch (error) {    <div className="flex min-h-screen bg-muted/40">

                </DropdownMenuItem>

              </DropdownMenuContent>      console.error('Error signing out:', error);      {/* Sidebar for desktop */}

            </DropdownMenu>

          </header>    }      {!isMobile && (

        )}

  };        <aside className="hidden md:flex w-64 flex-col border-r bg-card">

        {/* Main content */}

        <main className="flex-1 p-4 md:p-6">          <div className="p-4 border-b">

          {children}

        </main>  if (!user || !profile) {            <Link to="/dashboard" className="flex items-center gap-2">

      </div>

    </div>    return <>{children}</>;              <span className="font-bold text-lg text-primary">StudyCore</span>

  );

}  }              <span className="text-xs px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">

                {profile.role === 'student' ? 'Student' : 'Tutor'}

  return (              </span>

    <div className="flex min-h-screen bg-muted/40">            </Link>

      {/* Sidebar for desktop */}          </div>

      {!isMobile && (          <div className="flex-1 py-4">

        <aside className="hidden md:flex w-64 flex-col border-r bg-card">            <SidebarNav links={links} />

          <div className="p-4 border-b">          </div>

            <Link to="/dashboard" className="flex items-center gap-2">          <div className="border-t p-4">

              <span className="font-bold text-lg text-primary">StudyCore</span>            <div className="flex items-center gap-3 mb-4">

              <span className="text-xs px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">              <Avatar className="h-8 w-8">

                {profile.role === 'student' ? 'Student' : 'Tutor'}                <AvatarImage src={profile.avatar_url || undefined} />

              </span>                <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>

            </Link>              </Avatar>

          </div>              <div className="flex-1 overflow-hidden">

          <div className="flex-1 py-4">                <p className="font-medium truncate">{profile.full_name || 'User'}</p>

            <SidebarNav links={links} />                <p className="text-xs text-muted-foreground truncate">{user.email}</p>

          </div>              </div>

          <div className="border-t p-4">            </div>

            <div className="flex items-center gap-3 mb-4">            <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">

              <Avatar className="h-8 w-8">              <LogOut className="mr-2 h-4 w-4" />

                <AvatarImage src={profile.avatar_url || undefined} />              Sign Out

                <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>            </Button>

              </Avatar>          </div>

              <div className="flex-1 overflow-hidden">        </aside>

                <p className="font-medium truncate">{profile.full_name || 'User'}</p>      )}

                <p className="text-xs text-muted-foreground truncate">{user.email}</p>

              </div>      {/* Content */}

            </div>      <div className="flex-1 flex flex-col">

            <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">        {/* Header for mobile */}

              <LogOut className="mr-2 h-4 w-4" />        {isMobile && (

              Sign Out          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">

            </Button>            <Sheet>

          </div>              <SheetTrigger asChild>

        </aside>                <Button variant="outline" size="icon" className="shrink-0">

      )}                  <Menu className="h-4 w-4" />

                  <span className="sr-only">Toggle navigation menu</span>

      {/* Content */}                </Button>

      <div className="flex-1 flex flex-col">              </SheetTrigger>

        {/* Header for mobile */}              <SheetContent side="left" className="flex flex-col p-0">

        {isMobile && (                <SheetHeader className="border-b p-4">

          <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 sm:px-6">                  <SheetTitle>StudyCore</SheetTitle>

            <Sheet>                </SheetHeader>

              <SheetTrigger asChild>                <div className="flex-1 overflow-auto py-4">

                <Button variant="outline" size="icon" className="shrink-0">                  <SidebarNav links={links} />

                  <Menu className="h-4 w-4" />                </div>

                  <span className="sr-only">Toggle navigation menu</span>                <div className="border-t p-4">

                </Button>                  <div className="flex items-center gap-3 mb-4">

              </SheetTrigger>                    <Avatar className="h-8 w-8">

              <SheetContent side="left" className="flex flex-col p-0">                      <AvatarImage src={profile.avatar_url || undefined} />

                <SheetHeader className="border-b p-4">                      <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>

                  <SheetTitle>StudyCore</SheetTitle>                    </Avatar>

                </SheetHeader>                    <div className="flex-1 overflow-hidden">

                <div className="flex-1 overflow-auto py-4">                      <p className="font-medium truncate">{profile.full_name || 'User'}</p>

                  <SidebarNav links={links} />                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>

                </div>                    </div>

                <div className="border-t p-4">                  </div>

                  <div className="flex items-center gap-3 mb-4">                  <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">

                    <Avatar className="h-8 w-8">                    <LogOut className="mr-2 h-4 w-4" />

                      <AvatarImage src={profile.avatar_url || undefined} />                    Sign Out

                      <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>                  </Button>

                    </Avatar>                </div>

                    <div className="flex-1 overflow-hidden">              </SheetContent>

                      <p className="font-medium truncate">{profile.full_name || 'User'}</p>            </Sheet>

                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>            <div className="flex-1">

                    </div>              <Link to="/dashboard" className="flex items-center gap-2">

                  </div>                <span className="font-bold text-lg">StudyCore</span>

                  <Button onClick={handleSignOut} variant="outline" className="w-full justify-start">              </Link>

                    <LogOut className="mr-2 h-4 w-4" />            </div>

                    Sign Out            <DropdownMenu>

                  </Button>              <DropdownMenuTrigger asChild>

                </div>                <Button variant="ghost" size="icon" className="rounded-full">

              </SheetContent>                  <Avatar className="h-8 w-8">

            </Sheet>                    <AvatarImage src={profile.avatar_url || undefined} />

            <div className="flex-1">                    <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>

              <Link to="/dashboard" className="flex items-center gap-2">                  </Avatar>

                <span className="font-bold text-lg">StudyCore</span>                </Button>

              </Link>              </DropdownMenuTrigger>

            </div>              <DropdownMenuContent align="end">

            <DropdownMenu>                <DropdownMenuLabel>My Account</DropdownMenuLabel>

              <DropdownMenuTrigger asChild>                <DropdownMenuSeparator />

                <Button variant="ghost" size="icon" className="rounded-full">                <DropdownMenuItem onClick={() => navigate('/profile')}>

                  <Avatar className="h-8 w-8">                  <User className="mr-2 h-4 w-4" />

                    <AvatarImage src={profile.avatar_url || undefined} />                  Profile

                    <AvatarFallback>{profile.full_name?.charAt(0) || 'U'}</AvatarFallback>                </DropdownMenuItem>

                  </Avatar>                <DropdownMenuSeparator />

                </Button>                <DropdownMenuItem onClick={handleSignOut}>

              </DropdownMenuTrigger>                  <LogOut className="mr-2 h-4 w-4" />

              <DropdownMenuContent align="end">                  Sign Out

                <DropdownMenuLabel>My Account</DropdownMenuLabel>                </DropdownMenuItem>

                <DropdownMenuSeparator />              </DropdownMenuContent>

                <DropdownMenuItem onClick={() => navigate('/profile')}>            </DropdownMenu>

                  <User className="mr-2 h-4 w-4" />          </header>

                  Profile        )}

                </DropdownMenuItem>

                <DropdownMenuSeparator />        {/* Main content */}

                <DropdownMenuItem onClick={handleSignOut}>        <main className="flex-1">

                  <LogOut className="mr-2 h-4 w-4" />          {children}

                  Sign Out        </main>

                </DropdownMenuItem>      </div>

              </DropdownMenuContent>    </div>

            </DropdownMenu>  );

          </header>}
        )}

        {/* Main content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}