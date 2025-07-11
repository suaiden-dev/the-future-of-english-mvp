import React, { useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Home } from './pages/Home';
import { Translations } from './pages/Translations';
import { AdminDashboard } from './pages/AdminDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { DocumentVerification } from './pages/DocumentVerification';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Home as HomeIcon, FileText, Search, User, Shield, LogIn, UserPlus, LogOut } from 'lucide-react';

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
};

export type Document = {
  id: string;
  userId: string;
  filename: string;
  pages: number;
  status: 'pending' | 'processing' | 'completed';
  uploadDate: string;
  totalCost: number;
  verificationCode?: string;
  isAuthenticated?: boolean;
};

export type Folder = {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  createdAt: string;
  color?: string;
};

type Page = 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [user, setUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setCurrentPage(userData.role === 'admin' ? 'admin' : 'dashboard-customer');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentPage('home');
  };

  const handleDocumentUpload = (document: Document) => {
    setDocuments(prev => [...prev, document]);
  };

  const handleDocumentStatusUpdate = (documentId: string, status: Document['status']) => {
    setDocuments(prev => 
      prev.map(doc => 
        doc.id === documentId ? { ...doc, status } : doc
      )
    );
  };

  const handleFolderCreate = (folder: Folder) => {
    setFolders(prev => [...prev, folder]);
  };

  const handleFolderUpdate = (folderId: string, updates: Partial<Folder>) => {
    setFolders(prev => 
      prev.map(folder => 
        folder.id === folderId ? { ...folder, ...updates } : folder
      )
    );
  };

  const handleFolderDelete = (folderId: string) => {
    setFolders(prev => prev.filter(folder => folder.id !== folderId));
  };

  // Define navigation items based on user status
  const getNavItems = () => {
    const baseItems = [
      { id: 'home', label: 'Home', icon: HomeIcon, page: 'home' as Page },
      { id: 'translations', label: 'Translations', icon: FileText, page: 'translations' as Page },
      { id: 'verify', label: 'Verify Document', icon: Search, page: 'verify' as Page },
    ];

    if (user) {
      const userItems = [
        { id: 'dashboard', label: 'Dashboard', icon: User, page: 'dashboard-customer' as Page },
      ];
      
      if (user.role === 'admin') {
        userItems.push({ id: 'admin', label: 'Admin Panel', icon: Shield, page: 'admin' as Page });
      }
      
      return [...baseItems, ...userItems];
    } else {
      return [
        ...baseItems,
        { id: 'login', label: 'Login', icon: LogIn, page: 'login' as Page },
        { id: 'register', label: 'Register', icon: UserPlus, page: 'register' as Page },
      ];
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'translations':
        return <Translations onNavigate={setCurrentPage} />;
      case 'dashboard-customer':
        return (
          <CustomerDashboard 
            user={user} 
            documents={documents.filter(doc => doc.userId === user?.id)}
            folders={folders.filter(folder => folder.userId === user?.id)}
            onDocumentUpload={handleDocumentUpload}
            onFolderCreate={handleFolderCreate}
            onFolderUpdate={handleFolderUpdate}
            onFolderDelete={handleFolderDelete}
          />
        );
      case 'admin':
        return (
          <AdminDashboard 
            documents={documents}
            onStatusUpdate={handleDocumentStatusUpdate}
          />
        );
      case 'verify':
        return <DocumentVerification documents={documents} />;
      case 'login':
        return <Login onLogin={handleLogin} onNavigate={setCurrentPage} />;
      case 'register':
        return <Register onLogin={handleLogin} onNavigate={setCurrentPage} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show sidebar and different layout for dashboard pages */}
      {(currentPage === 'dashboard-customer' || currentPage === 'admin') && user ? (
        <div className="flex">
          <Sidebar 
            navItems={getNavItems()} 
            onNavigate={setCurrentPage} 
            currentPage={currentPage}
            user={user}
            onLogout={handleLogout}
          />
          <main className="flex-1">
            {renderPage()}
          </main>
        </div>
      ) : (
        <div>
          <Header 
            user={user} 
            onNavigate={setCurrentPage} 
            onLogout={handleLogout}
            currentPage={currentPage}
          />
          <main>
            {renderPage()}
          </main>
        </div>
      )}
    </div>
  );
}

export default App;