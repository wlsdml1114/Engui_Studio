'use client';

import React, { useState } from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FolderIcon, ChevronDownIcon, PlusIcon, TrashIcon } from 'lucide-react';

interface ProjectSelectorProps {
  currentProjectId: string | null;
  onProjectSelect: (projectId: string) => void;
  onNewProject: () => void;
}

export function ProjectSelector({
  currentProjectId,
  onProjectSelect,
  onNewProject,
}: ProjectSelectorProps) {
  const { projects, deleteProject } = useStudio();
  const [open, setOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentProject = projects.find(p => p.id === currentProjectId);

  const handleDelete = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      await deleteProject(projectToDelete);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error) {
      console.error('Failed to delete project:', error);
      setDeleteError(
        error instanceof Error 
          ? error.message 
          : 'Failed to delete project. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <FolderIcon className="w-4 h-4" />
            {currentProject?.title || 'Select Project'}
            <ChevronDownIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <DropdownMenuItem onClick={onNewProject}>
            <PlusIcon className="w-4 h-4 mr-2" />
            New Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {projects.map((project) => (
            <DropdownMenuItem
              key={project.id}
              className="flex items-center justify-between"
              onSelect={(e) => e.preventDefault()}
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => {
                  onProjectSelect(project.id);
                  setOpen(false);
                }}
              >
                <div className="font-medium">{project.title}</div>
                <div className="text-xs text-muted-foreground">
                  {project.aspectRatio}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(project.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectToDelete(project.id);
                  setDeleteDialogOpen(true);
                }}
              >
                <TrashIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {deleteError}
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteError(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
