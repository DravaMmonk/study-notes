// The kernel's icon table drawn (games/DESIGN.md 6.8): every name ../../engine/parts/icons.js lists, as the lucide icon of
// that name. icons.test.js keeps the two lists the same.
import {
  Activity, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowRightFromLine, ArrowRightLeft, ArrowUp,
  Binary, Blend, Box, Boxes, Braces, Brackets, Calculator, ChevronsDown, ChevronsUp, Circle, CircleDot,
  CircuitBoard, Clock, Combine, Contrast, Crop, Crosshair, Database, Divide, Equal, Eye, Filter, FlipHorizontal,
  FlipVertical, Gauge, GitBranch, GitFork, GitMerge, Grid3x3, Hash, Image, Key, Layers, Link, Lock, Maximize2,
  Merge, Minimize2, Minus, Move, MoveDown, MoveHorizontal, MoveUp, MoveVertical, Network, Palette, Percent, Pi,
  Plus, Puzzle, Radical, Repeat, RotateCcw, RotateCw, Rows3, Ruler, Scale, Scaling, ScanSearch, Search, Shuffle, Sigma,
  SlidersHorizontal, Split, Square, SquareFunction, Sun, Target, Timer, ToggleLeft, TrendingUp, Triangle, Waves,
  Waypoints, X, Zap
} from 'lucide-react'

export const ICONS = {
  Activity, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowRight, ArrowRightFromLine, ArrowRightLeft, ArrowUp,
  Binary, Blend, Box, Boxes, Braces, Brackets, Calculator, ChevronsDown, ChevronsUp, Circle, CircleDot,
  CircuitBoard, Clock, Combine, Contrast, Crop, Crosshair, Database, Divide, Equal, Eye, Filter, FlipHorizontal,
  FlipVertical, Gauge, GitBranch, GitFork, GitMerge, Grid3x3, Hash, Image, Key, Layers, Link, Lock, Maximize2,
  Merge, Minimize2, Minus, Move, MoveDown, MoveHorizontal, MoveUp, MoveVertical, Network, Palette, Percent, Pi,
  Plus, Puzzle, Radical, Repeat, RotateCcw, RotateCw, Rows3, Ruler, Scale, Scaling, ScanSearch, Search, Shuffle, Sigma,
  SlidersHorizontal, Split, Square, SquareFunction, Sun, Target, Timer, ToggleLeft, TrendingUp, Triangle, Waves,
  Waypoints, X, Zap
}

/** The icon a name stands for, or null. */
export const iconOf = (name) => ICONS[name] ?? null
