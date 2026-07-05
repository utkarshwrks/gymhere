"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addExercise, addMeal, assignDiet, assignWorkout, createDietPlan, createWorkoutPlan, deleteExercise } from "@/lib/actions/programs";

interface Exercise { id: string; dayLabel: string; name: string; sets: number; reps: string; restSec: number }
interface Meal { id: string; time: string; items: string; calories: number }
interface Workout { id: string; name: string; assignedTo: string | null; exercises: Exercise[] }
interface Diet { id: string; name: string; assignedTo: string | null; meals: Meal[] }
interface Opt { id: string; name: string }

export function WorkoutsView({ workouts, diets, members }: { workouts: Workout[]; diets: Diet[]; members: Opt[] }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Workouts & diet" description="Build templates, then assign them to members." />
      <Tabs defaultValue="workouts">
        <TabsList>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="diet">Diet</TabsTrigger>
        </TabsList>
        <TabsContent value="workouts"><WorkoutTab workouts={workouts} members={members} /></TabsContent>
        <TabsContent value="diet"><DietTab diets={diets} members={members} /></TabsContent>
      </Tabs>
    </div>
  );
}

function WorkoutTab({ workouts, members }: { workouts: Workout[]; members: Opt[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await createWorkoutPlan(name); if (r.ok) { toast.success("Plan created"); setName(""); router.refresh(); } else toast.error(r.error); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New workout plan (e.g. PPL Split)" className="max-w-sm" />
        <Button type="submit" disabled={!name.trim()}><Plus className="size-4" /> Create</Button>
      </form>
      {workouts.length === 0 ? (
        <EmptyState icon={Dumbbell} title="No workout plans" description="Create a template, add exercises, then assign it to a member." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} members={members} onDone={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}

function WorkoutCard({ workout, members, onDone }: { workout: Workout; members: Opt[]; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{workout.name}</CardTitle>
          {workout.assignedTo && <Badge variant="muted" className="mt-1">{workout.assignedTo}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select value="" onValueChange={async (mid) => { const r = await assignWorkout(workout.id, mid); if (r.ok) { toast.success("Assigned"); onDone(); } }}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Assign" /></SelectTrigger>
            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="size-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {workout.exercises.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No exercises yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {workout.exercises.map((ex) => (
              <li key={ex.id} className="flex items-center justify-between text-sm">
                <span><Badge variant="outline" className="mr-2">{ex.dayLabel}</Badge>{ex.name}</span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  {ex.sets}×{ex.reps} · {ex.restSec}s
                  <button onClick={async () => { const r = await deleteExercise(ex.id); if (r.ok) onDone(); }} className="hover:text-destructive"><Trash2 className="size-3.5" /></button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ExerciseDialog open={open} onOpenChange={setOpen} planId={workout.id} onDone={onDone} />
    </Card>
  );
}

function ExerciseDialog({ open, onOpenChange, planId, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; planId: string; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await addExercise({ planId, dayLabel: String(fd.get("day")), name: String(fd.get("name")), sets: Number(fd.get("sets")), reps: String(fd.get("reps")), restSec: Number(fd.get("rest")) });
    setPending(false);
    if (r.ok) { toast.success("Exercise added"); (e.target as HTMLFormElement).reset(); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add exercise</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Day</Label><Input name="day" required placeholder="Day 1 · Push" /></div>
            <div className="space-y-1.5"><Label>Exercise</Label><Input name="name" required placeholder="Bench press" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Sets</Label><Input name="sets" type="number" min={1} defaultValue={3} /></div>
            <div className="space-y-1.5"><Label>Reps</Label><Input name="reps" defaultValue="10" /></div>
            <div className="space-y-1.5"><Label>Rest (s)</Label><Input name="rest" type="number" min={0} defaultValue={60} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add exercise"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DietTab({ diets, members }: { diets: Diet[]; members: Opt[] }) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  return (
    <div className="space-y-4">
      <form className="flex gap-2" onSubmit={async (e) => { e.preventDefault(); const r = await createDietPlan(name); if (r.ok) { toast.success("Diet created"); setName(""); router.refresh(); } else toast.error(r.error); }}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New diet plan (e.g. Fat loss 1800 kcal)" className="max-w-sm" />
        <Button type="submit" disabled={!name.trim()}><Plus className="size-4" /> Create</Button>
      </form>
      {diets.length === 0 ? (
        <EmptyState icon={Utensils} title="No diet plans" description="Create a diet template, add meals, then assign it." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {diets.map((d) => (
            <DietCard key={d.id} diet={d} members={members} onDone={() => router.refresh()} />
          ))}
        </div>
      )}
    </div>
  );
}

function DietCard({ diet, members, onDone }: { diet: Diet; members: Opt[]; onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const total = diet.meals.reduce((s, m) => s + m.calories, 0);
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{diet.name}</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">{total} kcal/day{diet.assignedTo ? ` · ${diet.assignedTo}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value="" onValueChange={async (mid) => { const r = await assignDiet(diet.id, mid); if (r.ok) { toast.success("Assigned"); onDone(); } }}>
            <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Assign" /></SelectTrigger>
            <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="size-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {diet.meals.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No meals yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {diet.meals.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span><Badge variant="outline" className="mr-2">{m.time}</Badge>{m.items}</span>
                <span className="tnum text-muted-foreground">{m.calories} kcal</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <MealDialog open={open} onOpenChange={setOpen} planId={diet.id} onDone={onDone} />
    </Card>
  );
}

function MealDialog({ open, onOpenChange, planId, onDone }: { open: boolean; onOpenChange: (v: boolean) => void; planId: string; onDone: () => void }) {
  const [pending, setPending] = React.useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const r = await addMeal({ planId, time: String(fd.get("time")), items: String(fd.get("items")), calories: Number(fd.get("cal")), protein: Number(fd.get("p") || 0), carbs: Number(fd.get("c") || 0), fat: Number(fd.get("f") || 0) });
    setPending(false);
    if (r.ok) { toast.success("Meal added"); (e.target as HTMLFormElement).reset(); onDone(); } else toast.error(r.error);
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add meal</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>Time</Label><Input name="time" required placeholder="8:00 AM" /></div>
            <div className="space-y-1.5"><Label>Calories</Label><Input name="cal" type="number" min={0} required /></div>
          </div>
          <div className="space-y-1.5"><Label>Items</Label><Input name="items" required placeholder="3 eggs, oats, banana" /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Protein</Label><Input name="p" type="number" min={0} /></div>
            <div className="space-y-1.5"><Label>Carbs</Label><Input name="c" type="number" min={0} /></div>
            <div className="space-y-1.5"><Label>Fat</Label><Input name="f" type="number" min={0} /></div>
          </div>
          <DialogFooter><Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add meal"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
