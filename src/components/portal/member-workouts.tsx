"use client";

import * as React from "react";
import { Dumbbell, Utensils } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

interface Exercise { id: string; dayLabel: string; name: string; sets: number; reps: string; restSec: number }
interface Workout { id: string; name: string; exercises: Exercise[] }
interface Meal { id: string; time: string; items: string; calories: number }
interface Diet { id: string; name: string; meals: Meal[] }

export function MemberWorkouts({ workouts, diets }: { workouts: Workout[]; diets: Diet[] }) {
  return (
    <div className="space-y-6">
      <PageHeader title="Workout & diet" description="Your assigned plans." />
      <Tabs defaultValue="workout">
        <TabsList>
          <TabsTrigger value="workout">Workout</TabsTrigger>
          <TabsTrigger value="diet">Diet</TabsTrigger>
        </TabsList>
        <TabsContent value="workout">
          {workouts.length === 0 ? (
            <EmptyState icon={Dumbbell} title="No workout plan yet" description="Your trainer hasn't assigned a plan. Ask at the desk!" />
          ) : (
            <div className="space-y-4">{workouts.map((w) => <WorkoutViewer key={w.id} workout={w} />)}</div>
          )}
        </TabsContent>
        <TabsContent value="diet">
          {diets.length === 0 ? (
            <EmptyState icon={Utensils} title="No diet plan yet" description="No diet assigned yet." />
          ) : (
            <div className="space-y-4">{diets.map((d) => (
              <Card key={d.id}>
                <CardHeader className="flex-row items-center justify-between"><CardTitle>{d.name}</CardTitle><Badge variant="muted">{d.meals.reduce((s, m) => s + m.calories, 0)} kcal</Badge></CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {d.meals.map((m) => (
                      <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
                        <span><Badge variant="outline" className="mr-2">{m.time}</Badge>{m.items}</span>
                        <span className="tnum text-muted-foreground">{m.calories} kcal</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkoutViewer({ workout }: { workout: Workout }) {
  const days = Array.from(new Set(workout.exercises.map((e) => e.dayLabel)));
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});

  return (
    <Card>
      <CardHeader><CardTitle>{workout.name}</CardTitle></CardHeader>
      <CardContent>
        {days.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">No exercises yet.</p>
        ) : (
          <Tabs defaultValue={days[0]}>
            <TabsList className="flex-wrap">{days.map((d) => <TabsTrigger key={d} value={d}>{d}</TabsTrigger>)}</TabsList>
            {days.map((d) => (
              <TabsContent key={d} value={d}>
                <ul className="space-y-1.5">
                  {workout.exercises.filter((e) => e.dayLabel === d).map((e) => (
                    <li key={e.id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
                      <label className="flex items-center gap-2">
                        <Checkbox checked={!!checked[e.id]} onCheckedChange={(v) => setChecked((p) => ({ ...p, [e.id]: !!v }))} />
                        <span className={checked[e.id] ? "text-muted-foreground line-through" : ""}>{e.name}</span>
                      </label>
                      <span className="tnum text-muted-foreground">{e.sets}×{e.reps} · {e.restSec}s rest</span>
                    </li>
                  ))}
                </ul>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
