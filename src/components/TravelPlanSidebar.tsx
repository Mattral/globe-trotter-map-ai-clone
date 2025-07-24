
import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  MapPin, 
  DollarSign, 
  Calendar, 
  Sparkles, 
  Navigation,
  Car,
  Train,
  Plane,
  MapPinIcon,
  Clock,
  Route
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Groq from 'groq-sdk';

interface LocationData {
  country: string;
  city: string;
  formatted_address: string;
  lat: number;
  lng: number;
  nearby_places: string[];
}

interface TravelPlanSidebarProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  locationData: LocationData | null;
  userLocation: { lat: number; lng: number } | null;
}

const TravelPlanSidebar: React.FC<TravelPlanSidebarProps> = ({
  isOpen,
  onOpenChange,
  locationData,
  userLocation
}) => {
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [travelPlan, setTravelPlan] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [distances, setDistances] = useState<any>(null);
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  // Calculate distances when location data changes
  useEffect(() => {
    if (locationData && userLocation) {
      calculateDistances();
    }
  }, [locationData, userLocation]);

  const calculateDistances = async () => {
    if (!locationData || !userLocation || !window.google) return;
    
    setIsCalculatingDistance(true);
    
    try {
      const service = new google.maps.DistanceMatrixService();
      
      const result = await new Promise<google.maps.DistanceMatrixResponse>((resolve, reject) => {
        service.getDistanceMatrix(
          {
            origins: [new google.maps.LatLng(userLocation.lat, userLocation.lng)],
            destinations: [new google.maps.LatLng(locationData.lat, locationData.lng)],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.IMPERIAL,
            avoidHighways: false,
            avoidTolls: false
          },
          (response, status) => {
            if (status === 'OK' && response) {
              resolve(response);
            } else {
              reject(new Error('Distance calculation failed'));
            }
          }
        );
      });

      // Calculate for different travel modes
      const modes = [
        { mode: google.maps.TravelMode.DRIVING, icon: Car, name: 'Driving' },
        { mode: google.maps.TravelMode.WALKING, icon: MapPinIcon, name: 'Walking' },
        { mode: google.maps.TravelMode.BICYCLING, icon: Route, name: 'Bicycling' },
        { mode: google.maps.TravelMode.TRANSIT, icon: Train, name: 'Transit' }
      ];

      const distanceResults = await Promise.all(
        modes.map(async ({ mode, icon, name }) => {
          return new Promise<any>((resolve) => {
            service.getDistanceMatrix(
              {
                origins: [new google.maps.LatLng(userLocation.lat, userLocation.lng)],
                destinations: [new google.maps.LatLng(locationData.lat, locationData.lng)],
                travelMode: mode,
                unitSystem: google.maps.UnitSystem.IMPERIAL
              },
              (response, status) => {
                if (status === 'OK' && response?.rows[0]?.elements[0]) {
                  const element = response.rows[0].elements[0];
                  resolve({
                    mode: name,
                    icon,
                    distance: element.distance?.text || 'N/A',
                    duration: element.duration?.text || 'N/A',
                    status: element.status
                  });
                } else {
                  resolve({
                    mode: name,
                    icon,
                    distance: 'N/A',
                    duration: 'N/A',
                    status: 'NOT_FOUND'
                  });
                }
              }
            );
          });
        })
      );

      setDistances(distanceResults.filter(result => result.status === 'OK'));
    } catch (error) {
      console.error('Error calculating distances:', error);
    } finally {
      setIsCalculatingDistance(false);
    }
  };

  const generateTravelPlan = async () => {
    if (!locationData || !budget || !duration) {
      toast({
        title: "Missing Information",
        description: "Please provide both budget and duration.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    setTravelPlan('');

    try {
      const groq = new Groq({
        apiKey: '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',
        dangerouslyAllowBrowser: true
      });

      const prompt = `As an expert travel advisor, create a detailed travel plan for:

Location: ${locationData.formatted_address}
Country: ${locationData.country}
City: ${locationData.city}
Budget: $${budget} USD
Duration: ${duration} days
Nearby Places: ${locationData.nearby_places.join(', ')}

Please provide a comprehensive travel plan including:
1. Daily itinerary with specific activities and attractions
2. Budget breakdown (accommodation, food, activities, transport)
3. Best local restaurants and must-try dishes
4. Transportation recommendations
5. Cultural tips and local customs
6. Best times to visit attractions
7. Hidden gems and local favorites
8. Shopping recommendations
9. Safety tips
10. Weather considerations

Format the response in markdown with clear headings and organized sections.`;

      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 1,
        stream: false
      });

      const plan = chatCompletion.choices[0]?.message?.content || '';
      setTravelPlan(plan);
      
      toast({
        title: "Travel Plan Generated!",
        description: "Your personalized travel plan is ready."
      });

    } catch (error) {
      console.error('Error generating travel plan:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate travel plan. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatMarkdown = (text: string) => {
    return text
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
      .replace(/^\* (.*$)/gm, '<li class="ml-4 mb-1">• $1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br><br>');
  };

  const resetForm = () => {
    setBudget('');
    setDuration('');
    setTravelPlan('');
    setDistances(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <SheetContent side="left" className="w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Travel Planner
          </SheetTitle>
          <SheetDescription>
            Plan your perfect trip with AI assistance
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {locationData && (
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">{locationData.city}, {locationData.country}</h3>
                    <p className="text-sm text-muted-foreground">{locationData.formatted_address}</p>
                    {locationData.nearby_places.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium mb-1">Nearby Places:</p>
                        <div className="flex flex-wrap gap-1">
                          {locationData.nearby_places.slice(0, 3).map((place, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {place}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Distance Information */}
          {distances && distances.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Distance from Your Location
                </h4>
                <div className="space-y-2">
                  {distances.map((dist: any, index: number) => {
                    const IconComponent = dist.icon;
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          <span className="text-sm font-medium">{dist.mode}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{dist.distance}</p>
                          <p className="text-xs text-muted-foreground">{dist.duration}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {isCalculatingDistance && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating distances...
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="budget" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget (USD)
              </Label>
              <Input
                id="budget"
                type="number"
                placeholder="Enter your budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="duration" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Duration (days)
              </Label>
              <Input
                id="duration"
                type="number"
                placeholder="How many days?"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <Button 
            onClick={generateTravelPlan}
            disabled={isGenerating || !budget || !duration}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Travel Plan
              </>
            )}
          </Button>

          {travelPlan && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Your Personalized Travel Plan</h3>
                <div 
                  className="prose prose-sm max-w-none text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatMarkdown(travelPlan) }}
                />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TravelPlanSidebar;
