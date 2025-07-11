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
  folderId?: string | null;
};

export type Folder = {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  createdAt: string;
  color?: string;
};

type Page = 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register' | 'documents';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const handleDocumentUpload = (document: Document) => {
    setDocuments(prev => [...prev, document]);
  };

  const handleFolderCreate = (folder: Folder) => {
    setFolders(prev => [...prev, folder]);
  };

  const handleFolderUpdate = (folderId: string, updates: Partial<Folder>) => {
    setFolders(prev => prev.map(folder => 
      folder.id === folderId ? { ...folder, ...updates } : folder
    ));
  };

  const handleFolderDelete = (folderId: string) => {
    setFolders(prev => prev.filter(folder => folder.id !== folderId));
  };

  const handleViewDocument = (document: Document) => {
    // Implementar visualização de documento se necessário
    console.log('View document:', document);
  };

  // Define navigation items based on user status

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'translations':
        return <TranslationsPage />;
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
            onViewDocument={handleViewDocument}
          />
        );
      case 'documents':
        return (
          <DocumentManager
            user={user}
            documents={documents.filter(doc => doc.userId === user?.id)}
            folders={folders.filter(folder => folder.userId === user?.id)}
            onDocumentUpload={handleDocumentUpload}
            onFolderCreate={handleFolderCreate}
            onFolderUpdate={handleFolderUpdate}
            onFolderDelete={handleFolderDelete}
            onViewDocument={handleViewDocument}
          />
        );
      case 'admin':
        return user?.role === 'admin' ? <AdminDashboard /> : <div>Access denied</div>;
      case 'verify':
        return <VerifyPage onNavigate={setCurrentPage} />;
      case 'login':
        return <LoginPage onNavigate={setCurrentPage} onLogin={setUser} />;
      case 'register':
        return <RegisterPage onNavigate={setCurrentPage} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Only show sidebar and different layout for dashboard pages */}
      {(currentPage === 'dashboard-customer' || currentPage === 'admin' || currentPage === 'documents') && user ? (
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
        <>
          <Header 
            user={user} 
            onNavigate={setCurrentPage} 
            currentPage={currentPage}
            onLogout={handleLogout}
          />
          <main>
            {renderPage()}
          </main>
        </>
      )}
    </div>
  );
}