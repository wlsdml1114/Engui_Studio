'use client';

import React, { useState } from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { useI18n } from '@/lib/i18n/context';
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
  const { t } = useI18n();
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
          : t('videoEditor.projectSelector.deleteFailed')
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
            {currentProject?.title || t('videoEditor.projectSelector.selectProject')}
            <ChevronDownIcon className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80">
          <DropdownMenuItem onClick={onNewProject}>
            <PlusIcon className="w-4 h-4 mr-2" />
            {t('videoEditor.projectSelector.newProject')}
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
                  {t('videoEditor.projectSelector.updated')} {new Date(project.updatedAt).toLocaleDateString()}
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
            <DialogTitle>{t('videoEditor.projectSelector.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('videoEditor.projectSelector.deleteConfirmMessage')}
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
              {t('videoEditor.projectSelector.cancel')}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? t('videoEditor.projectSelector.deleting') : t('videoEditor.projectSelector.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
