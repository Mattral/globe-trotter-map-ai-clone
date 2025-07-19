import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, DollarSign, Calendar, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Groq from 'groq-sdk';
import ReactMarkdown from 'react-markdown';

interface LocationData {
  country: string;
  city: string;
  formatted_address: string;
  lat: number;
  lng: number;
  nearby_places: string[];
}

interface TravelPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationData: LocationData | null;
}

const TravelPlanModal: React.FC<TravelPlanModalProps> = ({
  open,
  onOpenChange,
  locationData
}) => {
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState('');
  const [travelPlan, setTravelPlan] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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

Format the response in a clear, organized manner with headings and bullet points.`;

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

  const resetForm = () => {
    setBudget('');
    setDuration('');
    setTravelPlan('');
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Travel Plan Generator
          </DialogTitle>
        </DialogHeader>

        {locationData && (
          <Card className="mb-4">
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
                        {locationData.nearby_places.slice(0, 5).map((place, index) => (
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

        <div className="grid grid-cols-2 gap-4 mb-4">
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
          className="w-full mb-4"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Your Travel Plan...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Travel Plan
            </>
          )}
        </Button>

        {travelPlan && (
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3">Your Personalized Travel Plan</h3>
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>
                  {travelPlan}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TravelPlanModal;
