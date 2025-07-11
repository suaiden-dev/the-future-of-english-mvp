@@ .. @@
 import React from 'react';
+import { useState } from 'react';
 import { FileText, DollarSign, Clock, Shield, CheckCircle, ArrowRight } from 'lucide-react';
+import { DocumentUploadModal } from './CustomerDashboard/DocumentUploadModal';
+import { User as UserType, Document } from '../App';
 
 interface TranslationsProps {
   onNavigate: (page: 'home' | 'translations' | 'dashboard-customer' | 'admin' | 'verify' | 'login' | 'register') => void;
+  user: UserType | null;
+  onDocumentUpload: (document: Document) => void;
 }
 
-export function Translations({ onNavigate }: TranslationsProps) {
+export function Translations({ onNavigate, user, onDocumentUpload }: TranslationsProps) {
+  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
+
+  const handleStartTranslation = () => {
+    if (user) {
+      setIsUploadModalOpen(true);
+    } else {
+      onNavigate('register');
+    }
+  };
+
   return (
     <div className="min-h-screen">
       {/* Hero Section */}
@@ .. @@
             <div className="flex flex-col sm:flex-row gap-4 justify-center">
               <button
-                onClick={() => onNavigate('register')}
+                onClick={handleStartTranslation}
                 className="bg-white text-blue-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
               >
                 <span>Start Translation</span>
@@ .. @@
                 <button
-                  onClick={() => onNavigate('register')}
+                  onClick={handleStartTranslation}
                   className="w-full bg-blue-900 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-800 transition-colors"
                 >
                   Get Started
@@ .. @@
           <div className="flex flex-col sm:flex-row gap-4 justify-center">
             <button
-              onClick={() => onNavigate('register')}
+              onClick={handleStartTranslation}
               className="bg-white text-blue-900 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2"
             >
               <span>Start Translation</span>
@@ .. @@
           </div>
         </div>
       </section>
+
+      {/* Upload Modal */}
+      {user && (
+        <DocumentUploadModal
+          isOpen={isUploadModalOpen}
+          onClose={() => setIsUploadModalOpen(false)}
+          onUpload={onDocumentUpload}
+          userId={user.id}
+        />
+      )}
     </div>
   );
 }