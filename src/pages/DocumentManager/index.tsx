@@ .. @@
   const [showUploadModal, setShowUploadModal] = useState(false);
+  const [selectedFile, setSelectedFile] = useState<File | null>(null);
+  const [pages, setPages] = useState(1);
+  const [isUploading, setIsUploading] = useState(false);
 
   const folderColors = [
@@ .. @@
   const handleDocumentUploadComplete = (document: Document) => {
     // Add the current folder ID to the document
     const documentWithFolder = {
       ...document,
       folderId: currentFolderId
     };
     onDocumentUpload(documentWithFolder);
     setShowUploadModal(false);
+    setSelectedFile(null);
+    setPages(1);
   };
 
+  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
+    const file = e.target.files?.[0];
+    if (file) {
+      setSelectedFile(file);
+    }
+  };
+
+  const handleQuickUpload = async () => {
+    if (!selectedFile || !user) return;
+
+    setIsUploading(true);
+
+    // Simulate upload process
+    await new Promise(resolve => setTimeout(resolve, 2000));
+
+    const newDocument: Document = {
+      id: Date.now().toString(),
+      userId: user.id,
+      filename: selectedFile.name,
+      pages,
+      status: 'pending',
+      uploadDate: new Date().toISOString(),
+      totalCost: pages * 20,
+      verificationCode: `TFE${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
+      isAuthenticated: true,
+      folderId: currentFolderId
+    };
+
+    onDocumentUpload(newDocument);
+    setIsUploading(false);
+    setSelectedFile(null);
+    setPages(1);
+  };
+
   const copyVerificationCode = (code: string) => {
     navigator.clipboard.writeText(code);
     // You could add a toast notification here
@@ .. @@
               <button
                 onClick={handleUploadDocument}
                 className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
               >
                 <Upload className="w-4 h-4" />
                 <span>Upload</span>
               </button>
             </div>
           </div>
 
+          {/* Quick Upload Section */}
+          <div className="bg-blue-50 p-4 rounded-lg">
+            <h3 className="text-sm font-medium text-blue-900 mb-3">Quick Upload</h3>
+            <div className="flex items-center space-x-3">
+              <input
+                type="file"
+                onChange={handleFileSelect}
+                accept=".pdf,.jpg,.jpeg,.png"
+                className="hidden"
+                id="quick-file-upload"
+              />
+              <label
+                htmlFor="quick-file-upload"
+                className="flex-1 px-3 py-2 border border-blue-300 rounded-md bg-white text-sm cursor-pointer hover:bg-blue-50 transition-colors"
+              >
+                {selectedFile ? selectedFile.name : 'Choose file...'}
+              </label>
+              <input
+                type="number"
+                min="1"
+                max="50"
+                value={pages}
+                onChange={(e) => setPages(Math.max(1, parseInt(e.target.value) || 1))}
+                className="w-20 px-2 py-2 border border-blue-300 rounded-md text-sm"
+                placeholder="Pages"
+              />
+              <button
+                onClick={handleQuickUpload}
+                disabled={!selectedFile || isUploading}
+                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
+              >
+                {isUploading ? 'Uploading...' : `Upload ($${pages * 20})`}
+              </button>
+            </div>
+          </div>
+
           {/* Search and View Controls */}
           <div className="flex items-center justify-between">