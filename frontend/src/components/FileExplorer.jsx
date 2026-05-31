import { useState } from 'react';
import { Folder, FolderOpen, File, FileCode, ChevronDown, ChevronRight } from 'lucide-react';

const FileNode = ({ node, activeFile, onSelectFile, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(depth === 0); // Open root by default
  const isDirectory = node.type === 'directory';

  const handleClick = (e) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onSelectFile(node.path);
    }
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    const codeExts = ['js', 'jsx', 'ts', 'tsx', 'py', 'go', 'rs', 'java', 'cpp', 'html', 'css', 'json', 'yml', 'yaml', 'sh', 'md'];
    if (codeExts.includes(ext)) {
      return <FileCode className="w-4 h-4 text-brand-cyan" />;
    }
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const isActive = activeFile === node.path;

  return (
    <div className="select-none text-sm">
      <div 
        onClick={handleClick}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-colors ${
          isActive 
            ? 'bg-brand-indigo/15 dark:bg-brand-indigo/20 text-slate-900 dark:text-white font-bold border-l-2 border-brand-cyan' 
            : 'text-slate-700 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
      >
        <div className="flex items-center space-x-2 truncate">
          {isDirectory ? (
            <>
              {isOpen ? (
                <FolderOpen className="w-4 h-4 text-brand-violet shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-brand-violet shrink-0" />
              )}
            </>
          ) : (
            getFileIcon(node.name)
          )}
          <span className="truncate">{node.name}</span>
        </div>

        {isDirectory && (
          <span className="text-slate-600 shrink-0">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </span>
        )}
      </div>

      {isDirectory && isOpen && node.children && (
        <div className="mt-0.5">
          {node.children
            .sort((a, b) => {
              // Folders first, then files alphabetically
              if (a.type === 'directory' && b.type !== 'directory') return -1;
              if (a.type !== 'directory' && b.type === 'directory') return 1;
              return a.name.localeCompare(b.name);
            })
            .map((child, idx) => (
              <FileNode 
                key={`${child.path}-${idx}`} 
                node={child} 
                activeFile={activeFile}
                onSelectFile={onSelectFile}
                depth={depth + 1}
              />
            ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer = ({ fileTree, activeFile, onSelectFile }) => {
  if (!fileTree || !fileTree.children) {
    return (
      <div className="text-slate-500 text-sm p-4 text-center">
        No files to explore.
      </div>
    );
  }

  return (
    <div className="overflow-y-auto max-h-[calc(100vh-12rem)] pr-2">
      <FileNode node={fileTree} activeFile={activeFile} onSelectFile={onSelectFile} />
    </div>
  );
};

export default FileExplorer;
