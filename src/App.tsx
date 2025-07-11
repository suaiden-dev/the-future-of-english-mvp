@@ .. @@
 export type Folder = {
   id: string;
   userId: string;
   name: string;
   parentId?: string;
   createdAt: string;
   color?: string;
 };

-type Page = 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register';
+type Page = 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register' | 'documents';

 function App() {
   const [currentPage, setCurrentPage] = useState<Page>('home');
@@ .. @@
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
+      case 'documents':
+        return (
+          <DocumentManager
+            user={user}
+            documents={documents.filter(doc => doc.userId === user?.id)}
+            folders={folders.filter(folder => folder.userId === user?.id)}
+            onDocumentUpload={handleDocumentUpload}
+            onFolderCreate={handleFolderCreate}
+            onFolderUpdate={handleFolderUpdate}
+            onFolderDelete={handleFolderDelete}
+            onViewDocument={(doc) => {}} // Will be implemented
+          />
+        );
       case 'admin':
@@ .. @@
       {/* Only show sidebar and different layout for dashboard pages */}
-      {(currentPage === 'dashboard-customer' || currentPage === 'admin') && user ? (
+      {(currentPage === 'dashboard-customer' || currentPage === 'admin' || currentPage === 'documents') && user ? (
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