import React from 'react';
import { cn } from '../lib/utils';
import {
  Home,
  Compass,
  Dices,
  Bookmark,
  History,
  User,
  Search,
  Pencil,
  Navigation, ChevronDown, ChevronLeft,
  MapPin,
  Heart,
  Settings,
  Circle,
  Plus,
  Trash2,
  X,
  Star,
  Check,
  Utensils,
  Coffee,
  Wine,
  Trophy,
  Lock,
  Camera,
  Map,
  TreePine,
  Image,
  Store,
  Film,
  Ticket,
  Camera as Camera2
} from 'lucide-react';

interface IconWrapperProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  className?: string;
  fill?: string;
  stroke?: string;
}

export function IconWrapper({ name, className, ...props }: IconWrapperProps) {
  const defaultSize = className?.includes('w-') ? '' : 'w-5 h-5';
  const combinedClass = cn(defaultSize, className);
  
  switch (name) {
    case 'home': return <Home className={combinedClass} {...props} />;
    case 'explore': case 'info': return <Compass className={combinedClass} {...props} />;
    case 'casino': case 'sports_esports': return <Dices className={combinedClass} {...props} />;
    case 'bookmark': case 'shopping_bag': return <Bookmark className={combinedClass} {...props} />;
    case 'history': case 'calendar_today': case 'refresh': return <History className={combinedClass} {...props} />;
    case 'person': case 'user_circle': return <User className={combinedClass} {...props} />;
    case 'search': return <Search className={combinedClass} {...props} />;
    case 'edit': case 'palette': return <Pencil className={combinedClass} {...props} />;
    case 'add': return <Plus className={combinedClass} {...props} />;
    case 'navigation': return <Navigation className={combinedClass} {...props} />;
    case 'chevron_left': return <ChevronLeft className={combinedClass} {...props} />;
    case 'expand_more': return <ChevronDown className={combinedClass} {...props} />;
    case 'location_on': case 'city': return <MapPin className={combinedClass} {...props} />;
    case 'park': case 'nature': return <TreePine className={combinedClass} {...props} />;
    case 'favorite': return <Heart className={combinedClass} {...props} />;
    case 'star': return <Star className={combinedClass} {...props} />;
    case 'check': case 'check_circle': return <Check className={combinedClass} {...props} />;
    case 'restaurant': return <Utensils className={combinedClass} {...props} />;
    case 'local_cafe': return <Coffee className={combinedClass} {...props} />;
    case 'local_bar': return <Wine className={combinedClass} {...props} />;
    case 'map': return <Map className={combinedClass} {...props} />;
    case 'emoji_events': return <Trophy className={combinedClass} {...props} />;
    case 'lock': return <Lock className={combinedClass} {...props} />;
    case 'photo_camera': return <Camera className={combinedClass} {...props} />;
    case 'delete': return <Trash2 className={combinedClass} {...props} />;
    case 'close': return <X className={combinedClass} {...props} />;
    case 'settings': case 'tune': return <Settings className={combinedClass} {...props} />;
    case 'image': return <Image className={combinedClass} {...props} />;
    case 'store': case 'shopping': return <Store className={combinedClass} {...props} />;
    case 'movie': case 'entertainment': return <Film className={combinedClass} {...props} />;
    case 'ticket': case 'culture': return <Ticket className={combinedClass} {...props} />;
    case 'photography': return <Camera2 className={combinedClass} {...props} />;
    case 'meeting': return <Heart className={combinedClass} {...props} />;
    default:
      // Fallback
      return <Circle className={combinedClass} {...props} />;
  }
}
