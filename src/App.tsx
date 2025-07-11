@@ .. @@
 export type Folder = {
   id: string;
   userId: string;
   name: string;
   parentId?: string | null;
   createdAt: string;
   color?: string;
 };
 
-type Page = 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register' | 'documents';
+type Page = 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register' | 'documents' | 'contact';
 
 function App() {
@@ .. @@
       case 'home':
         return <Home onNavigate={setCurrentPage} />;
       case 'translations':
-        return <Translations onNavigate={setCurrentPage} />;
+        return (
+          <Translations 
+            onNavigate={setCurrentPage} 
+            user={user}
+            onDocumentUpload={handleDocumentUpload}
+          />
+        );
       case 'dashboard-customer':
@@ .. @@
         return <DocumentVerification documents={documents} />;
       case 'login':
         return <Login onLogin={handleLogin} onNavigate={setCurrentPage} />;
       case 'register':
         return <Register onLogin={handleLogin} onNavigate={setCurrentPage} />;
+      case 'contact':
+        return <Contact onNavigate={setCurrentPage} />;
       default:
         return <Home onNavigate={setCurrentPage} />;
     }
   };