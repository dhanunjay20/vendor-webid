import { MapPin, Navigation, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocationUpdate } from '@/hooks/use-location-tracking';

interface LocationTrackerProps {
  vendorId: string | null;
  currentLatitude?: number | null;
  currentLongitude?: number | null;
  lastUpdated?: string | null;
  onLocationUpdated?: () => void;
}

export function LocationTracker({ 
  vendorId, 
  currentLatitude, 
  currentLongitude, 
  lastUpdated,
  onLocationUpdated 
}: LocationTrackerProps) {
  const { isUpdating, error, updateLocation } = useLocationUpdate(vendorId);

  const handleUpdateLocation = async () => {
    const result = await updateLocation();
    if (result && onLocationUpdated) {
      // Show success feedback
      console.log('✅ Location updated successfully:', result);
      onLocationUpdated();
    }
  };

  const formatCoordinate = (coord: number | null | undefined) => {
    return coord ? coord.toFixed(6) : 'Not set';
  };

  const formatLastUpdated = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const hasLocation = currentLatitude != null && currentLongitude != null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Business Location</CardTitle>
          </div>
        </div>
        <CardDescription>
          Update your business location to help customers find you
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!vendorId && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to update location
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Latitude</p>
            <p className="text-lg font-mono">{formatCoordinate(currentLatitude)}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Longitude</p>
            <p className="text-lg font-mono">{formatCoordinate(currentLongitude)}</p>
          </div>

          <div className="col-span-2 space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
            <p className="text-lg">{formatLastUpdated(lastUpdated)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={handleUpdateLocation}
            disabled={!vendorId || isUpdating}
            className="w-full"
            size="lg"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Getting GPS Location...
              </>
            ) : (
              <>
                <Navigation className="h-4 w-4 mr-2" />
                {hasLocation ? 'Update My Location' : 'Set My Location'}
              </>
            )}
          </Button>

          {hasLocation && (
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                const url = `https://www.google.com/maps?q=${currentLatitude},${currentLongitude}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
          )}
        </div>

        <div className="bg-muted/50 rounded-md p-3">
          <p className="text-xs text-muted-foreground text-center">
            💡 For best accuracy: Enable GPS/Location services on your device and allow browser location access
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
