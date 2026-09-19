import { NextResponse } from "next/server";

const summaries = [
  "Freezing",
  "Bracing",
  "Chilly",
  "Cool",
  "Mild",
  "Warm",
  "Balmy",
  "Hot",
  "Sweltering",
  "Scorching",
];

type WeatherForecast = {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
};

export async function GET() {
  const forecast: WeatherForecast[] = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index + 1);

    const temperatureC = Math.floor(Math.random() * 75) - 20;

    return {
      date: date.toISOString().slice(0, 10),
      temperatureC,
      temperatureF: 32 + Math.round(temperatureC / 0.5556),
      summary: summaries[Math.floor(Math.random() * summaries.length)],
    };
  });

  return NextResponse.json(forecast);
}
