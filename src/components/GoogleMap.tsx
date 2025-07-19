import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
/// <reference types="google.maps" />
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Layers, 
  Camera,
  Car,
  Trash2,
  Settings,
  Maximize
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDS3XDIsHVSdtiA3kwMyyOcvVWsXEZQFlw';

interface GoogleMapProps {
  className?: string;
}

const GoogleMap: React.FC<GoogleMapProps> = ({ className = '' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<string>('roadmap');
  const [trafficLayer, setTrafficLayer] = useState<google.maps.TrafficLayer | null>(null);
  const [streetView, setStreetView] = useState(false);
  const [drawingMode, setDrawingMode] = useState<string | null>(null);

  useEffect(() => {
    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places', 'geometry', 'drawing']
        });

        await loader.load();

        if (!mapRef.current) return;

        // Initialize map
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 40.7128, lng: -74.0060 }, // New York City
          zoom: 12,
          mapTypeId: 'roadmap',
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
          scaleControl: true,
          rotateControl: true,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }]
            }
          ]
        });

        mapInstanceRef.current = map;

        // Initialize services
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          draggable: true,
          panel: document.getElementById('directions-panel') || undefined
        });
        directionsRendererRef.current.setMap(map);

        infoWindowRef.current = new google.maps.InfoWindow();

        // Initialize drawing manager
        drawingManagerRef.current = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: false,
          markerOptions: {
            draggable: true,
            animation: google.maps.Animation.DROP
          },
          polylineOptions: {
            editable: true,
            draggable: true,
            strokeColor: '#FF0000',
            strokeWeight: 2
          },
          rectangleOptions: {
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            strokeColor: '#FF0000',
            strokeWeight: 2,
            editable: true,
            draggable: true
          },
          circleOptions: {
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            strokeColor: '#FF0000',
            strokeWeight: 2,
            editable: true,
            draggable: true
          },
          polygonOptions: {
            fillColor: '#FF0000',
            fillOpacity: 0.35,
            strokeColor: '#FF0000',
            strokeWeight: 2,
            editable: true,
            draggable: true
          }
        });
        drawingManagerRef.current.setMap(map);

        // Initialize traffic layer
        const traffic = new google.maps.TrafficLayer();
        setTrafficLayer(traffic);

        // Initialize search autocomplete
        const searchInput = document.getElementById('search-input') as HTMLInputElement;
        if (searchInput) {
          const autocomplete = new google.maps.places.Autocomplete(searchInput);
          autocomplete.bindTo('bounds', map);
          autocompleteRef.current = autocomplete;

          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.geometry || !place.geometry.location) {
              toast({
                title: "Location not found",
                description: "Please try a different search term.",
                variant: "destructive"
              });
              return;
            }

            map.setCenter(place.geometry.location);
            map.setZoom(15);

            // Add marker for searched place
            addMarker(place.geometry.location, place.name || 'Searched Location', place.formatted_address);
          });
        }

        // Click listener for adding markers
        map.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            addMarker(event.latLng, 'Custom Marker', `Lat: ${event.latLng.lat()}, Lng: ${event.latLng.lng()}`);
          }
        });

        toast({
          title: "Google Maps Loaded",
          description: "All features are ready to use!"
        });

      } catch (error) {
        console.error('Error loading Google Maps:', error);
        toast({
          title: "Error loading map",
          description: "Please check your internet connection and try again.",
          variant: "destructive"
        });
      }
    };

    initMap();
  }, []);

  const addMarker = (position: google.maps.LatLng, title: string, description?: string) => {
    if (!mapInstanceRef.current) return;

    const marker = new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      title,
      animation: google.maps.Animation.DROP,
      draggable: true
    });

    marker.addListener('click', () => {
      if (infoWindowRef.current) {
        infoWindowRef.current.setContent(`
          <div class="p-2">
            <h3 class="font-semibold text-lg">${title}</h3>
            ${description ? `<p class="text-sm text-gray-600">${description}</p>` : ''}
            <div class="mt-2 flex gap-2">
              <button onclick="getDirections(${position.lat()}, ${position.lng()})" class="px-3 py-1 bg-blue-500 text-white rounded text-sm">Directions</button>
              <button onclick="streetViewHere(${position.lat()}, ${position.lng()})" class="px-3 py-1 bg-green-500 text-white rounded text-sm">Street View</button>
            </div>
          </div>
        `);
        infoWindowRef.current.open(mapInstanceRef.current, marker);
      }
    });

    markersRef.current.push(marker);
  };

  const clearMarkers = () => {
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    toast({
      title: "Markers cleared",
      description: "All markers have been removed from the map."
    });
  };

  const changeMapType = (type: string) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setMapTypeId(type as google.maps.MapTypeId);
      setMapType(type);
    }
  };

  const toggleTraffic = () => {
    if (trafficLayer && mapInstanceRef.current) {
      if (trafficLayer.getMap()) {
        trafficLayer.setMap(null);
        toast({ title: "Traffic layer hidden" });
      } else {
        trafficLayer.setMap(mapInstanceRef.current);
        toast({ title: "Traffic layer shown" });
      }
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive"
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pos = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(pos);
          mapInstanceRef.current.setZoom(16);
          addMarker(pos, 'Your Location', 'Current location');
        }
      },
      () => {
        toast({
          title: "Location error",
          description: "Could not get your current location.",
          variant: "destructive"
        });
      }
    );
  };

  const toggleDrawing = (mode: string | null) => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setDrawingMode(mode as google.maps.drawing.OverlayType);
      setDrawingMode(mode);
    }
  };

  return (
    <div className={`relative w-full h-screen bg-background ${className}`}>
      {/* Search and Controls */}
      <Card className="absolute top-4 left-4 z-10 p-4 bg-map-controls">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-input"
                placeholder="Search for places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={getCurrentLocation} variant="outline" size="icon">
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Map Type Controls */}
          <div className="flex gap-1">
            <Button 
              variant={mapType === 'roadmap' ? "default" : "outline"}
              size="sm"
              onClick={() => changeMapType('roadmap')}
            >
              Road
            </Button>
            <Button 
              variant={mapType === 'satellite' ? "default" : "outline"}
              size="sm"
              onClick={() => changeMapType('satellite')}
            >
              Satellite
            </Button>
            <Button 
              variant={mapType === 'hybrid' ? "default" : "outline"}
              size="sm"
              onClick={() => changeMapType('hybrid')}
            >
              Hybrid
            </Button>
            <Button 
              variant={mapType === 'terrain' ? "default" : "outline"}
              size="sm"
              onClick={() => changeMapType('terrain')}
            >
              Terrain
            </Button>
          </div>
        </div>
      </Card>

      {/* Drawing Tools */}
      <Card className="absolute top-4 right-4 z-10 p-3 bg-map-controls">
        <div className="flex flex-col gap-2">
          <Button 
            variant={drawingMode === 'marker' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDrawing(drawingMode === 'marker' ? null : 'marker')}
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button 
            variant={drawingMode === 'polyline' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDrawing(drawingMode === 'polyline' ? null : 'polyline')}
          >
            ━
          </Button>
          <Button 
            variant={drawingMode === 'polygon' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDrawing(drawingMode === 'polygon' ? null : 'polygon')}
          >
            ⬟
          </Button>
          <Button 
            variant={drawingMode === 'rectangle' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDrawing(drawingMode === 'rectangle' ? null : 'rectangle')}
          >
            ▭
          </Button>
          <Button 
            variant={drawingMode === 'circle' ? "default" : "outline"}
            size="sm"
            onClick={() => toggleDrawing(drawingMode === 'circle' ? null : 'circle')}
          >
            ○
          </Button>
        </div>
      </Card>

      {/* Additional Controls */}
      <Card className="absolute bottom-4 left-4 z-10 p-3 bg-map-controls">
        <div className="flex gap-2">
          <Button onClick={toggleTraffic} variant="outline" size="sm">
            <Car className="h-4 w-4 mr-2" />
            Traffic
          </Button>
          <Button onClick={clearMarkers} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </Card>

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full rounded-lg shadow-lg" />

      {/* Status Badge */}
      <Badge className="absolute bottom-4 right-4 z-10 bg-accent text-accent-foreground">
        Google Maps Pro
      </Badge>
    </div>
  );
};

// Global functions for marker interactions
declare global {
  interface Window {
    getDirections: (lat: number, lng: number) => void;
    streetViewHere: (lat: number, lng: number) => void;
  }
}

window.getDirections = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  window.open(url, '_blank');
};

window.streetViewHere = (lat: number, lng: number) => {
  const url = `https://www.google.com/maps/@${lat},${lng},3a,75y,0h,90t/data=!3m4!1e1!3m2!1s0x0:0x0!2e0`;
  window.open(url, '_blank');
};

export default GoogleMap;