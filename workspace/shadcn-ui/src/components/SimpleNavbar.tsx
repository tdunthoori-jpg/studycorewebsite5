import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimpleAuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Home,
  BookOpen,
  Calendar,
  FileText,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Shield,
  Menu
} from 'lucide-react';

export function SimpleNavbar() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const navItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    ...(profile?.role === 'admin' ? [
      { icon: Shield, label: 'Admin', path: '/admin' }
    ] : [
      { icon: BookOpen, label: 'Classes', path: '/classes' },
      { icon: Calendar, label: 'Schedule', path: '/schedule' },
      { icon: FileText, label: 'Assignments', path: '/assignments' },
      { icon: MessageSquare, label: 'Messages', path: '/messages' },
      ...(profile?.role === 'tutor' ? [{ icon: Users, label: 'Students', path: '/students' }] : []),
    ]),
  ];

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-blue-950/80 border-b border-sky-600/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="font-bold text-lg sm:text-xl text-sky-300 flex items-center gap-2">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="hidden xs:inline">StudyCore</span>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                size="sm"
                onClick={() => navigate(item.path)}
                className="flex items-center gap-2 text-sky-100 hover:text-sky-300 hover:bg-sky-500/20 transition-all duration-300"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            ))}
          </div>

          {/* Mobile Menu and User Menu */}
          <div className="flex items-center gap-2">
            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden text-sky-300 hover:text-sky-100 hover:bg-sky-500/20"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[300px] bg-blue-950/95 border-sky-600/50">
                <SheetHeader>
                  <SheetTitle className="text-sky-300 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    StudyCore
                  </SheetTitle>
                  <SheetDescription className="text-sky-100/70">
                    {profile?.full_name}
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Button
                      key={item.path}
                      variant="ghost"
                      onClick={() => handleNavigation(item.path)}
                      className="w-full justify-start text-sky-100 hover:text-sky-300 hover:bg-sky-500/20"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </Button>
                  ))}
                  <div className="my-2 border-t border-sky-600/30" />
                  <Button
                    variant="ghost"
                    onClick={() => handleNavigation('/profile')}
                    className="w-full justify-start text-sky-100 hover:text-sky-300 hover:bg-sky-500/20"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      handleSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/20"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {profile?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}