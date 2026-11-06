import {
  Combine, Scissors, Trash2, FileOutput, ListOrdered, RotateCw, Minimize2, Wrench, Layers, Palette,
  FileImage, Image, ImageDown, FileText, Type, PenTool, Droplets, Hash, Info, ImageMinus, Scaling, RefreshCw, File,
  FileType, Sheet, Presentation, Table, MonitorPlay, ScanText, Lock, LockOpen,
  FilePen, Grid3x3, GalleryHorizontal, FilePlus2,
  Code, Images, ScanLine, FileCode, GitCompareArrows, Crop, TextCursorInput, EyeOff, Stamp,
} from 'lucide-react';

const ICONS = {
  Combine, Scissors, Trash2, FileOutput, ListOrdered, RotateCw, Minimize2, Wrench, Layers, Palette,
  FileImage, Image, ImageDown, FileText, Type, PenTool, Droplets, Hash, Info, ImageMinus, Scaling, RefreshCw,
  FileType, Sheet, Presentation, Table, MonitorPlay, ScanText, Lock, LockOpen,
  FilePen, Grid3x3, GalleryHorizontal, FilePlus2,
  Code, Images, ScanLine, FileCode, GitCompareArrows, Crop, TextCursorInput, EyeOff, Stamp,
};

export default function ToolIcon({ name, className = 'h-6 w-6' }) {
  const Icon = ICONS[name] || File;
  return <Icon className={className} aria-hidden="true" />;
}
