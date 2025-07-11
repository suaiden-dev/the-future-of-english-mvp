@@ .. @@
  const dashboardNavItems = [
    { id: 'overview', label: 'Overview', icon: User, page: 'dashboard-customer' },
    { id: 'documents', label: 'My Documents', icon: FolderOpen, page: 'documents' as any },
    { id: 'upload', label: 'Upload', icon: FileTextIcon, page: 'upload' },
    { id: 'translations', label: 'Translations', icon: FileTextIcon, page: 'translations' },
    { id: 'verify', label: 'Verify Document', icon: FileTextIcon, page: 'verify' },
  ];

@@ .. @@
          {dashboardNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.page;
            
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.page)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 border border-blue-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}