import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ruler } from "lucide-react";

const mensSizes = [
  { us: "6", uk: "5.5", eu: "38.5", cm: "24" },
  { us: "7", uk: "6", eu: "40", cm: "25" },
  { us: "8", uk: "7", eu: "41", cm: "26" },
  { us: "9", uk: "8", eu: "42", cm: "27" },
  { us: "10", uk: "9", eu: "43", cm: "28" },
  { us: "11", uk: "10", eu: "44", cm: "29" },
  { us: "12", uk: "11", eu: "45", cm: "30" },
  { us: "13", uk: "12", eu: "46", cm: "31" },
];

const womensSizes = [
  { us: "5", uk: "3", eu: "35.5", cm: "22" },
  { us: "6", uk: "4", eu: "36.5", cm: "23" },
  { us: "7", uk: "5", eu: "37.5", cm: "24" },
  { us: "8", uk: "6", eu: "38.5", cm: "25" },
  { us: "9", uk: "7", eu: "40", cm: "26" },
  { us: "10", uk: "8", eu: "41", cm: "27" },
  { us: "11", uk: "9", eu: "42", cm: "28" },
];

interface SizeChartDialogProps {
  trigger?: React.ReactNode;
}

export function SizeChartDialog({ trigger }: SizeChartDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-auto p-0 text-primary underline-offset-4 hover:underline">
            <Ruler className="mr-1 h-3.5 w-3.5" />
            Size Guide
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">Shoe Size Guide</DialogTitle>
          <DialogDescription>
            Find your perfect fit with our comprehensive size chart
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="mens" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mens">Men's Sizes</TabsTrigger>
            <TabsTrigger value="womens">Women's Sizes</TabsTrigger>
          </TabsList>

          <TabsContent value="mens" className="mt-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">US</TableHead>
                    <TableHead className="font-semibold">UK</TableHead>
                    <TableHead className="font-semibold">EU</TableHead>
                    <TableHead className="font-semibold">CM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensSizes.map((size) => (
                    <TableRow key={size.us}>
                      <TableCell>{size.us}</TableCell>
                      <TableCell>{size.uk}</TableCell>
                      <TableCell>{size.eu}</TableCell>
                      <TableCell>{size.cm}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="womens" className="mt-4">
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">US</TableHead>
                    <TableHead className="font-semibold">UK</TableHead>
                    <TableHead className="font-semibold">EU</TableHead>
                    <TableHead className="font-semibold">CM</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {womensSizes.map((size) => (
                    <TableRow key={size.us}>
                      <TableCell>{size.us}</TableCell>
                      <TableCell>{size.uk}</TableCell>
                      <TableCell>{size.eu}</TableCell>
                      <TableCell>{size.cm}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-4 rounded-lg bg-muted/50 p-4">
          <h4 className="font-semibold text-sm mb-2">How to Measure Your Foot</h4>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Stand on a piece of paper with your heel against a wall</li>
            <li>Mark the longest point of your foot on the paper</li>
            <li>Measure the distance from the wall to the mark in centimeters</li>
            <li>Use the CM column to find your size</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-3">
            💡 Tip: If you're between sizes, we recommend going up to the next size for comfort.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
