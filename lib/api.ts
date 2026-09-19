export type WeatherForecast = {
  date: string;
  temperatureC: number;
  temperatureF: number;
  summary: string;
};

export async function getWeatherForecast(): Promise<WeatherForecast[]> {
  const res = await fetch("/api/weatherforecast");

  if (!res.ok) {
    throw new Error(`Failed to fetch weather forecast: ${res.status}`);
  }

  return res.json();
}
