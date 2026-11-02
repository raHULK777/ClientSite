"use client";

import { Info } from "lucide-react";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  RadioGroup,
  RadioOption,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Stamp } from "@/components/ui/stamp";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function InteractiveDemo() {
  const [notify, setNotify] = useState(true);
  const [toastOpen, setToastOpen] = useState(false);

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <div className="flex flex-col gap-6">
        <div>
          <p className="type-label mb-3 text-muted">Dialog</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button>Open change order</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle>Approve change order 04</DialogTitle>
              <DialogDescription>
                Relocate the island outlet and patch the cabinet back. Review the scope and
                amount before signing.
              </DialogDescription>
              <div className="mt-5 flex items-baseline justify-between border-y border-dotted border-line-strong py-3">
                <span className="text-sm text-ink-soft">Amount due at completion</span>
                <span className="type-data text-xl font-semibold text-ink">$1,840.00</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="pending">Awaiting signature</Badge>
                <Stamp>Draft</Stamp>
              </div>
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="secondary">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button>Approve $1,840</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <p className="type-label mb-3 text-muted">Select</p>
          <Select defaultValue="kitchen">
            <SelectTrigger aria-label="Project scope">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kitchen">Kitchen remodel</SelectItem>
              <SelectItem value="bath">Bath remodel</SelectItem>
              <SelectItem value="addition">Addition</SelectItem>
              <SelectItem value="structural">Structural repair</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="type-label mb-3 text-muted">Radio group</p>
          <RadioGroup defaultValue="standard" aria-label="Finish tier">
            <RadioOption
              id="finish-standard"
              value="standard"
              label="Standard"
              hint="Builder-grade cabinets, quartz, painted trim."
            />
            <RadioOption
              id="finish-select"
              value="select"
              label="Select"
              hint="Semi-custom cabinets, slab backsplash, solid-core doors."
            />
            <RadioOption
              id="finish-custom"
              value="custom"
              label="Custom"
              hint="Site-built millwork, stone fabrication, integrated lighting."
            />
          </RadioGroup>
        </div>

        <div>
          <p className="type-label mb-3 text-muted">Popover</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="secondary" size="sm">
                Allowance detail
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <p className="type-label text-muted">Electrical allowance</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                $1,900 is held until the island layout is confirmed. Unused allowance is
                credited; overage is issued as a change order before work starts.
              </p>
              <div className="mt-3 border-t border-dotted border-line-strong pt-2">
                <p className="type-data text-sm font-semibold">$1,900.00</p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-3">
          <label htmlFor="notify" className="flex min-h-11 cursor-pointer items-center gap-3">
            <Checkbox
              id="notify"
              checked={notify}
              onCheckedChange={(value) => setNotify(value === true)}
            />
            <span className="text-sm text-ink">Text me when the client signs</span>
          </label>

          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="w-fit">
                  <Info className="h-4 w-4" aria-hidden="true" />
                  Why we ask
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Allowances are labeled so the range never hides a decision you still owe the
                client.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <ToastProvider swipeDirection="right">
            <Button variant="ghost" size="sm" className="w-fit" onClick={() => setToastOpen(true)}>
              Send the quote
            </Button>
            <Toast open={toastOpen} onOpenChange={setToastOpen} duration={5000}>
              <div>
                <ToastTitle>Quote sent</ToastTitle>
                <ToastDescription>
                  Dana will get one link. You will see when it is opened, and again when it is
                  signed.
                </ToastDescription>
              </div>
              <ToastClose />
            </Toast>
            <ToastViewport />
          </ToastProvider>
        </div>
      </div>

      <div>
        <p className="type-label mb-3 text-muted">Tabs and field states</p>
        <Tabs defaultValue="scope">
          <TabsList>
            <TabsTrigger value="scope">Scope</TabsTrigger>
            <TabsTrigger value="takeoff">Takeoff</TabsTrigger>
            <TabsTrigger value="terms">Terms</TabsTrigger>
          </TabsList>
          <TabsContent value="scope" className="text-sm leading-relaxed text-ink-soft">
            Scope answers stay in plain language. Every line that changes the price is named,
            and every allowance says what it is waiting on.
          </TabsContent>
          <TabsContent value="takeoff" className="text-sm leading-relaxed text-ink-soft">
            The takeoff schedule carries quantity, unit, rate, and total in separate columns so
            a client can check the arithmetic.
          </TabsContent>
          <TabsContent value="terms" className="text-sm leading-relaxed text-ink-soft">
            Terms are set in the contractor&rsquo;s words, with license, service area, and
            validity window in the title block.
          </TabsContent>
        </Tabs>

        <div className="mt-6 grid gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="demo-email" className="type-label text-ink">
              Client email
            </label>
            <Input
              id="demo-email"
              type="email"
              placeholder="name@example.com"
              aria-describedby="demo-email-hint"
            />
            <p id="demo-email-hint" className="text-xs text-muted">
              We send one link. No account, no password.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="demo-error" className="type-label text-ink">
              Square footage
            </label>
            <Input
              id="demo-error"
              inputMode="numeric"
              defaultValue="0"
              aria-invalid="true"
              aria-describedby="demo-error-message"
            />
            <p id="demo-error-message" role="alert" className="text-xs text-revision">
              ! Enter a number between 40 and 12,000.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
