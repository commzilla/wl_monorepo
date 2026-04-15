import React, { useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface CertificateVisualEditorProps {
  backgroundFile: string;
  namePosition: { x: number; y: number; fontSize: number };
  datePosition: { x: number; y: number; fontSize: number };
  profitSharePosition?: { x: number; y: number; fontSize: number };
  onNamePositionChange: (position: { x: number; y: number; fontSize: number }) => void;
  onDatePositionChange: (position: { x: number; y: number; fontSize: number }) => void;
  onProfitSharePositionChange?: (position: { x: number; y: number; fontSize: number }) => void;
  availableImages: string[];
  showProfitShare?: boolean;
}

export const CertificateVisualEditor = ({
  backgroundFile,
  namePosition,
  datePosition,
  profitSharePosition,
  onNamePositionChange,
  onDatePositionChange,
  onProfitSharePositionChange,
  availableImages,
  showProfitShare = false,
}: CertificateVisualEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    element: 'name' | 'date' | 'profitShare' | null;
    offset: { x: number; y: number };
  }>({
    isDragging: false,
    element: null,
    offset: { x: 0, y: 0 },
  });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [originalImageSize, setOriginalImageSize] = useState({ width: 800, height: 600 });
  
  // Custom preview text states
  const [customNameText, setCustomNameText] = useState("John Doe");
  const [customDateText, setCustomDateText] = useState(new Date().toLocaleDateString());
  const [customProfitShareText, setCustomProfitShareText] = useState("$80.00");
  
  const { toast } = useToast();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !backgroundFile) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load background image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Store original image dimensions
      setOriginalImageSize({ width: img.width, height: img.height });
      
      // Calculate canvas size maintaining aspect ratio
      const maxWidth = 800;
      const maxHeight = 600;
      const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
      
      const newWidth = img.width * scale;
      const newHeight = img.height * scale;
      
      canvas.width = newWidth;
      canvas.height = newHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      
      // Draw background
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Draw text elements
      drawTextElements(ctx, newWidth / img.width, newHeight / img.height);
      setImageLoaded(true);
    };

    img.onerror = () => {
      console.error('Failed to load certificate background image');
      setImageLoaded(false);
    };

    // Map filenames to CDN URLs
    const getCDNUrl = (filename: string) => {
      const cdnBaseUrl = 'https://we-fund.b-cdn.net/templates/';
      return backgroundFile.startsWith('http') 
        ? backgroundFile 
        : `${cdnBaseUrl}${filename}`;
    };
    
    const imageUrl = getCDNUrl(backgroundFile);
    img.src = imageUrl;
    
    // Add fallback for when image fails to load
    img.onerror = () => {
      console.warn(`Failed to load image: ${imageUrl}, using placeholder`);
      img.src = `https://via.placeholder.com/800x600/f0f0f0/333333?text=${encodeURIComponent(backgroundFile)}`;
    };
  }, [backgroundFile, namePosition, datePosition, profitSharePosition, showProfitShare, customNameText, customDateText, customProfitShareText]);

  const drawTextElements = (ctx: CanvasRenderingContext2D, scaleX: number, scaleY: number) => {
    // Draw custom name text
    ctx.font = `${namePosition.fontSize * scaleY}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(customNameText, namePosition.x * scaleX, namePosition.y * scaleY);

    // Draw custom date text
    ctx.font = `${datePosition.fontSize * scaleY}px Arial`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(customDateText, datePosition.x * scaleX, datePosition.y * scaleY);

    // Draw custom profit share text if enabled
    if (showProfitShare && profitSharePosition) {
      ctx.font = `${profitSharePosition.fontSize * scaleY}px Arial`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.fillText(customProfitShareText, profitSharePosition.x * scaleX, profitSharePosition.y * scaleY);
    }

    // Draw draggable indicators
    drawDragHandle(ctx, namePosition.x * scaleX, namePosition.y * scaleY, 'name');
    drawDragHandle(ctx, datePosition.x * scaleX, datePosition.y * scaleY, 'date');
    if (showProfitShare && profitSharePosition) {
      drawDragHandle(ctx, profitSharePosition.x * scaleX, profitSharePosition.y * scaleY, 'profitShare');
    }
  };

  const drawDragHandle = (ctx: CanvasRenderingContext2D, x: number, y: number, type: string) => {
    // Draw a larger, more visible handle for dragging
    const handleSize = 16;
    const handleX = x - handleSize / 2;
    const handleY = y - 25 - handleSize / 2;
    
    // Draw handle background
    const colors = {
      name: '#3b82f6',
      date: '#ef4444',
      profitShare: '#10b981'
    };
    ctx.fillStyle = colors[type as keyof typeof colors] || '#3b82f6';
    ctx.fillRect(handleX, handleY, handleSize, handleSize);
    
    // Draw white border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(handleX, handleY, handleSize, handleSize);
    
    // Draw label
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    const labels = { name: 'N', date: 'D', profitShare: 'P' };
    ctx.fillText(labels[type as keyof typeof labels] || 'N', x, y - 25 + 3);
  };

  const getCanvasCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const getOriginalCoordinates = (canvasX: number, canvasY: number) => {
    return {
      x: Math.round((canvasX / canvasSize.width) * originalImageSize.width),
      y: Math.round((canvasY / canvasSize.height) * originalImageSize.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const scaleX = canvasSize.width / originalImageSize.width;
    const scaleY = canvasSize.height / originalImageSize.height;

    // Check if clicking on name handle (handle is positioned above the text)
    const nameHandleX = namePosition.x * scaleX;
    const nameHandleY = (namePosition.y - 25) * scaleY; // Handle is 25px above text
    if (Math.abs(x - nameHandleX) < 15 && Math.abs(y - nameHandleY) < 15) {
      setDragState({
        isDragging: true,
        element: 'name',
        offset: { x: x - nameHandleX, y: y - nameHandleY },
      });
      return;
    }

    // Check if clicking on date handle (handle is positioned above the text)
    const dateHandleX = datePosition.x * scaleX;
    const dateHandleY = (datePosition.y - 25) * scaleY; // Handle is 25px above text
    if (Math.abs(x - dateHandleX) < 15 && Math.abs(y - dateHandleY) < 15) {
      setDragState({
        isDragging: true,
        element: 'date',
        offset: { x: x - dateHandleX, y: y - dateHandleY },
      });
      return;
    }

    // Check if clicking on profit share handle (if enabled)
    if (showProfitShare && profitSharePosition) {
      const profitShareHandleX = profitSharePosition.x * scaleX;
      const profitShareHandleY = (profitSharePosition.y - 25) * scaleY;
      if (Math.abs(x - profitShareHandleX) < 15 && Math.abs(y - profitShareHandleY) < 15) {
        setDragState({
          isDragging: true,
          element: 'profitShare',
          offset: { x: x - profitShareHandleX, y: y - profitShareHandleY },
        });
        return;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragState.isDragging || !dragState.element) return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);
    const adjustedX = x - dragState.offset.x;
    const adjustedY = y - dragState.offset.y + 25; // Compensate for handle being above text
    const originalCoords = getOriginalCoordinates(adjustedX, adjustedY);

    if (dragState.element === 'name') {
      onNamePositionChange({
        ...namePosition,
        x: Math.max(0, Math.min(originalImageSize.width, originalCoords.x)),
        y: Math.max(25, Math.min(originalImageSize.height, originalCoords.y)),
      });
    } else if (dragState.element === 'date') {
      onDatePositionChange({
        ...datePosition,
        x: Math.max(0, Math.min(originalImageSize.width, originalCoords.x)),
        y: Math.max(25, Math.min(originalImageSize.height, originalCoords.y)),
      });
    } else if (dragState.element === 'profitShare' && onProfitSharePositionChange && profitSharePosition) {
      onProfitSharePositionChange({
        ...profitSharePosition,
        x: Math.max(0, Math.min(originalImageSize.width, originalCoords.x)),
        y: Math.max(25, Math.min(originalImageSize.height, originalCoords.y)),
      });
    }
  };

  const handleMouseUp = () => {
    setDragState({
      isDragging: false,
      element: null,
      offset: { x: 0, y: 0 },
    });
  };

  const createHighResCanvas = async (): Promise<HTMLCanvasElement> => {
    return new Promise((resolve, reject) => {
      const highResCanvas = document.createElement('canvas');
      const ctx = highResCanvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Use original image dimensions for high quality
        highResCanvas.width = img.width;
        highResCanvas.height = img.height;
        
        // Draw background at full resolution
        ctx.drawImage(img, 0, 0);
        
        // Draw text at original positions (no scaling needed)
        ctx.font = `${namePosition.fontSize}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(customNameText, namePosition.x, namePosition.y);

        ctx.font = `${datePosition.fontSize}px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(customDateText, datePosition.x, datePosition.y);

        if (showProfitShare && profitSharePosition) {
          ctx.font = `${profitSharePosition.fontSize}px Arial`;
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'left';
          ctx.fillText(customProfitShareText, profitSharePosition.x, profitSharePosition.y);
        }
        
        resolve(highResCanvas);
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      const getCDNUrl = (filename: string) => {
        const cdnBaseUrl = 'https://we-fund.b-cdn.net/templates/';
        return backgroundFile.startsWith('http') 
          ? backgroundFile 
          : `${cdnBaseUrl}${filename}`;
      };
      
      img.src = getCDNUrl(backgroundFile);
    });
  };

  const handleDownloadJPG = async () => {
    try {
      const highResCanvas = await createHighResCanvas();
      
      highResCanvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'certificate.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Downloaded",
          description: "Certificate downloaded as high-quality JPG",
        });
      }, 'image/jpeg', 1.0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download certificate",
        variant: "destructive",
      });
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const highResCanvas = await createHighResCanvas();
      
      const imgData = highResCanvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: highResCanvas.width > highResCanvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [highResCanvas.width, highResCanvas.height]
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, highResCanvas.width, highResCanvas.height);
      pdf.save('certificate.pdf');
      
      toast({
        title: "Downloaded",
        description: "Certificate downloaded as high-quality PDF",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download certificate",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              Visual Certificate Editor
              <Badge variant="outline">Live Preview</Badge>
            </div>
            {imageLoaded && (
              <div className="flex gap-2">
                <Button
                  onClick={handleDownloadJPG}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download JPG
                </Button>
                <Button
                  onClick={handleDownloadPDF}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={containerRef} className="relative">
            {backgroundFile ? (
              <div className="border rounded-lg overflow-hidden bg-gray-50">
                <canvas
                  ref={canvasRef}
                  className={`max-w-full cursor-${dragState.isDragging ? 'grabbing' : 'grab'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                      <p className="text-sm text-muted-foreground">Loading preview...</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-12 text-center bg-gray-50">
                <p className="text-muted-foreground">Select a background image to start editing</p>
              </div>
            )}
            
            <div className="mt-4 text-sm text-muted-foreground">
              <p><strong>Instructions:</strong></p>
              <ul className="list-disc ml-4 space-y-1">
                <li>Drag the blue <Badge variant="outline" className="inline-block">N</Badge> handle to position the name text</li>
                <li>Drag the red <Badge variant="outline" className="inline-block">D</Badge> handle to position the date text</li>
                {showProfitShare && (
                  <li>Drag the green <Badge variant="outline" className="inline-block">P</Badge> handle to position the profit share text</li>
                )}
                <li>Adjust font sizes using the controls below</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className={`grid gap-4 ${showProfitShare ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Name Text Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="custom_name_text">Preview Text</Label>
              <Input
                id="custom_name_text"
                type="text"
                value={customNameText}
                onChange={(e) => setCustomNameText(e.target.value)}
                placeholder="Enter name to preview"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="name_x">X Position</Label>
                <Input
                  id="name_x"
                  type="number"
                  value={namePosition.x}
                  onChange={(e) => onNamePositionChange({
                    ...namePosition,
                    x: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="name_y">Y Position</Label>
                <Input
                  id="name_y"
                  type="number"
                  value={namePosition.y}
                  onChange={(e) => onNamePositionChange({
                    ...namePosition,
                    y: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="name_font_size">Font Size</Label>
              <Input
                id="name_font_size"
                type="number"
                value={namePosition.fontSize}
                onChange={(e) => onNamePositionChange({
                  ...namePosition,
                  fontSize: parseInt(e.target.value) || 50
                })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Date Text Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="custom_date_text">Preview Text</Label>
              <Input
                id="custom_date_text"
                type="text"
                value={customDateText}
                onChange={(e) => setCustomDateText(e.target.value)}
                placeholder="Enter date to preview"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="date_x">X Position</Label>
                <Input
                  id="date_x"
                  type="number"
                  value={datePosition.x}
                  onChange={(e) => onDatePositionChange({
                    ...datePosition,
                    x: parseInt(e.target.value) || 0
                  })}
                />
              </div>
              <div>
                <Label htmlFor="date_y">Y Position</Label>
                <Input
                  id="date_y"
                  type="number"
                  value={datePosition.y}
                  onChange={(e) => onDatePositionChange({
                    ...datePosition,
                    y: parseInt(e.target.value) || 0
                  })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date_font_size">Font Size</Label>
              <Input
                id="date_font_size"
                type="number"
                value={datePosition.fontSize}
                onChange={(e) => onDatePositionChange({
                  ...datePosition,
                  fontSize: parseInt(e.target.value) || 36
                })}
              />
            </div>
          </CardContent>
        </Card>

        {showProfitShare && profitSharePosition && onProfitSharePositionChange && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Profit Share Text Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="custom_profit_share_text">Preview Text</Label>
                <Input
                  id="custom_profit_share_text"
                  type="text"
                  value={customProfitShareText}
                  onChange={(e) => setCustomProfitShareText(e.target.value)}
                  placeholder="Enter profit share to preview"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="profit_share_x">X Position</Label>
                  <Input
                    id="profit_share_x"
                    type="number"
                    value={profitSharePosition.x}
                    onChange={(e) => onProfitSharePositionChange({
                      ...profitSharePosition,
                      x: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="profit_share_y">Y Position</Label>
                  <Input
                    id="profit_share_y"
                    type="number"
                    value={profitSharePosition.y}
                    onChange={(e) => onProfitSharePositionChange({
                      ...profitSharePosition,
                      y: parseInt(e.target.value) || 0
                    })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="profit_share_font_size">Font Size</Label>
                <Input
                  id="profit_share_font_size"
                  type="number"
                  value={profitSharePosition.fontSize}
                  onChange={(e) => onProfitSharePositionChange({
                    ...profitSharePosition,
                    fontSize: parseInt(e.target.value) || 36
                  })}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};