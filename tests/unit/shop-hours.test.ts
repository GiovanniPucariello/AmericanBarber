import { describe, expect, it } from "vitest";
import { shopHours } from "@/lib/availability/shop-hours";

describe("shopHours", () => {
  it("spans first opening to last closing per day, closed when no rules", () => {
    const hours = shopHours([
      { weekday: 1, start_time: "08:20:00", end_time: "20:00:00" },
      { weekday: 1, start_time: "08:00:00", end_time: "22:00:00" },
      { weekday: 5, start_time: "07:45:00", end_time: "20:00:00" },
      { weekday: 5, start_time: "08:00:00", end_time: "19:00:00" },
    ]);
    expect(hours[0]).toEqual({ day: "Lunedì", hours: "Chiuso" });
    expect(hours[1]).toEqual({ day: "Martedì", hours: "08–22" });
    expect(hours[5]).toEqual({ day: "Sabato", hours: "07:45–20" });
    expect(hours[6]).toEqual({ day: "Domenica", hours: "Chiuso" });
  });
});
