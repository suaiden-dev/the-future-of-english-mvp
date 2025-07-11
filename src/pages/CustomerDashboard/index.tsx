@@ .. @@
 interface CustomerDashboardProps {
   user: UserType | null;
   documents: Document[];
   folders: Folder[];
   onDocumentUpload: (document: Document) => void;
   onFolderCreate: (folder: Folder) => void;
   onFolderUpdate: (folderId: string, updates: Partial<Folder>) => void;
   onFolderDelete: (folderId: string) => void;
+  onViewDocument: (document: Document) => void;
 }

 export function CustomerDashboard({ 
   user, 
   documents, 
   folders, 
   onDocumentUpload, 
   onFolderCreate, 
   onFolderUpdate, 
-  onFolderDelete 
+  onFolderDelete,
+  onViewDocument
 }: CustomerDashboardProps) {