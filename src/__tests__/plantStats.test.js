import { aggregateHealthPerMonth, enrichPlants } from '../components/PlantStatsOverview.jsx';

describe('aggregateHealthPerMonth', () => {
  test('groups health statuses by month', () => {
    const raw = [
      { id:'1', name:'A', type:'X', plantingDate:'2025-01-10', expectedHarvestDate:'2025-02-10', healthStatus:'Healthy' },
      { id:'2', name:'B', type:'X', plantingDate:'2025-01-15', expectedHarvestDate:'2025-02-20', healthStatus:'Sick' },
      { id:'3', name:'C', type:'X', plantingDate:'2025-02-01', expectedHarvestDate:'2025-03-01', healthStatus:'Healthy' }
    ];
    const enriched = enrichPlants(raw);
    const agg = aggregateHealthPerMonth(enriched);
    const jan = agg.find(r=>r.month==='2025-01');
    const feb = agg.find(r=>r.month==='2025-02');
    expect(jan.Healthy).toBe(1);
    expect(jan.Sick).toBe(1);
    expect(feb.Healthy).toBe(1);
  });
});
