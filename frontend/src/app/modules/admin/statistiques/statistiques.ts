import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef, PLATFORM_ID, inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { finalize } from 'rxjs';
import { StatsService } from '../../../core/services/stats.service';

@Component({
  selector: 'app-statistiques',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistiques.html',
  styleUrl: './statistiques.scss',
})
export class Statistiques implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('agentsCanvas')   agentsRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('vehiculesCanvas') vehiculesRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statutCanvas')   statutRef!:   ElementRef<HTMLCanvasElement>;
  @ViewChild('dailyCanvas')    dailyRef!:    ElementRef<HTMLCanvasElement>;
  @ViewChild('zonesCanvas')    zonesRef!:    ElementRef<HTMLCanvasElement>;

  private platformId = inject(PLATFORM_ID);
  private Chart: any  = null;

  // ── État ──────────────────────────────────────────────────────────────────
  loading    = true;
  lastUpdate: Date | null = null;

  // ── Instances Chart.js ────────────────────────────────────────────────────
  private charts: Record<string, any> = {};

  // ── Données brutes (pour ré-affichage / debug) ────────────────────────────
  data: any = {};

  private refreshTimer: any;

  constructor(private statsSvc: StatsService) {}

  ngOnInit() {}

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    await this.loadChartLib();
    await this.fetchAndRender();
    // Auto-refresh toutes les 30 secondes
    this.refreshTimer = setInterval(() => this.fetchAndRender(), 30_000);
  }

  ngOnDestroy() {
    clearInterval(this.refreshTimer);
    Object.values(this.charts).forEach(c => c?.destroy());
  }

  // ── Chargement Chart.js (lazy, browser-only) ─────────────────────────────

  private async loadChartLib() {
    const mod = await import('chart.js');
    mod.Chart.register(...mod.registerables);
    this.Chart = mod.Chart;
  }

  // ── Fetch + Render ────────────────────────────────────────────────────────

  async fetchAndRender() {
    this.loading = true;
    this.statsSvc.getAnalytics().pipe(
      finalize(() => { this.loading = false; })
    ).subscribe({
      next: r => {
        this.data = r?.data ?? {};
        this.renderAll(this.data);
        this.lastUpdate = new Date();
      },
      error: () => {}
    });
  }

  private renderAll(d: any) {
    this.buildAgentsChart(d.agentsPerformance   ?? []);
    this.buildVehiculesChart(d.vehiculesUtilisation ?? []);
    this.buildStatutChart(d.collectesStatut     ?? {});
    this.buildDailyChart(d.collectesParJour     ?? []);
    this.buildZonesChart(d.signalParZone        ?? []);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 1. Performance des agents — Bar chart groupé (horizontal)
  // ════════════════════════════════════════════════════════════════════════════

  private buildAgentsChart(agents: any[]) {
    const labels  = agents.map(a => a.agentName);
    const collect = agents.map(a => a.nbCollectes);
    const volumes = agents.map(a => a.volumeTotal);

    if (this.charts['agents']) {
      const c = this.charts['agents'];
      c.data.labels                  = labels;
      c.data.datasets[0].data        = collect;
      c.data.datasets[1].data        = volumes;
      c.update('active');
      return;
    }

    const ctx = this.agentsRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.charts['agents'] = new this.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Collectes effectuées',
            data: collect,
            backgroundColor: 'rgba(34,197,94,.85)',
            borderColor:     '#16a34a',
            borderWidth: 1.5,
            borderRadius: 6,
          },
          {
            label: 'Volume collecté (m³)',
            data: volumes,
            backgroundColor: 'rgba(59,130,246,.75)',
            borderColor:     '#2563eb',
            borderWidth: 1.5,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
          legend: { position: 'top' as const },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const unit = ctx.datasetIndex === 1 ? ' m³' : ' collectes';
                return ` ${ctx.dataset.label}: ${ctx.raw}${unit}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: { font: { size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 12 } },
          },
        },
        animation: { duration: 800, easing: 'easeInOutQuart' as const },
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. Utilisation des camions — Doughnut
  // ════════════════════════════════════════════════════════════════════════════

  private readonly PALETTE = [
    '#22c55e','#3b82f6','#f59e0b','#8b5cf6',
    '#ef4444','#06b6d4','#ec4899','#f97316',
    '#84cc16','#a855f7',
  ];

  private buildVehiculesChart(vehicules: any[]) {
    const labels = vehicules.map(v => v.immatriculation);
    const data   = vehicules.map(v => v.nbTournees);
    const colors = vehicules.map((_, i) => this.PALETTE[i % this.PALETTE.length]);

    if (this.charts['vehicules']) {
      const c = this.charts['vehicules'];
      c.data.labels                       = labels;
      c.data.datasets[0].data             = data;
      c.data.datasets[0].backgroundColor  = colors;
      c.update('active');
      return;
    }

    const ctx = this.vehiculesRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.charts['vehicules'] = new this.Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'right' as const, labels: { font: { size: 12 }, padding: 14, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const pct   = ((ctx.raw / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${ctx.raw} tournée(s) (${pct}%)`;
              },
            },
          },
        },
        animation: { animateRotate: true, duration: 800 },
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. Statut des collectes — Pie
  // ════════════════════════════════════════════════════════════════════════════

  private buildStatutChart(statut: Record<string, number>) {
    const keys   = ['Collecté', 'En cours', 'Planifié'];
    const labels = keys;
    const data   = keys.map(k => statut[k] ?? 0);
    const colors = ['#22c55e', '#3b82f6', '#f59e0b'];

    if (this.charts['statut']) {
      const c = this.charts['statut'];
      c.data.datasets[0].data = data;
      c.update('active');
      return;
    }

    const ctx = this.statutRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.charts['statut'] = new this.Chart(ctx, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 3,
          hoverOffset: 10,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right' as const, labels: { font: { size: 12 }, padding: 14, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (ctx: any) => {
                const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const pct   = total ? ((ctx.raw / total) * 100).toFixed(1) : 0;
                return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
              },
            },
          },
        },
        animation: { animateRotate: true, duration: 800 },
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. Collectes par jour — Line chart avec fill gradient
  // ════════════════════════════════════════════════════════════════════════════

  private buildDailyChart(days: { date: string; count: number }[]) {
    const labels = days.map(d => {
      const [, m, day] = d.date.split('-');
      return `${day}/${m}`;
    });
    const data = days.map(d => d.count);

    if (this.charts['daily']) {
      const c = this.charts['daily'];
      c.data.labels              = labels;
      c.data.datasets[0].data   = data;
      c.update('active');
      return;
    }

    const ctx = this.dailyRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, 280);
    grad.addColorStop(0,   'rgba(34,197,94,.4)');
    grad.addColorStop(0.6, 'rgba(34,197,94,.1)');
    grad.addColorStop(1,   'rgba(34,197,94,0)');

    this.charts['daily'] = new this.Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Collectes par jour',
          data,
          borderColor:           '#22c55e',
          backgroundColor:       grad,
          borderWidth:           2.5,
          pointBackgroundColor:  '#22c55e',
          pointBorderColor:      '#fff',
          pointBorderWidth:      2,
          pointRadius:           4,
          pointHoverRadius:      7,
          fill:                  true,
          tension:               0.4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            mode: 'index' as const,
            intersect: false,
            callbacks: {
              label: (ctx: any) => ` ${ctx.raw} collecte(s)`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              maxTicksLimit: 10,
              font: { size: 11 },
            },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: {
              stepSize: 1,
              font: { size: 11 },
            },
          },
        },
        interaction: { mode: 'nearest' as const, axis: 'x' as const, intersect: false },
        animation: { duration: 800, easing: 'easeInOutQuart' as const },
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 5. Signalements par zone — Bar chart horizontal
  // ════════════════════════════════════════════════════════════════════════════

  private buildZonesChart(zones: any[]) {
    const labels = zones.map(z => z.zoneNom);
    const data   = zones.map(z => z.nbSignalements);
    // Gradient rouge → orange selon la sévérité
    const colors = zones.map((_, i) => {
      const ratio = zones.length > 1 ? i / (zones.length - 1) : 0;
      const r = Math.round(239 + (251 - 239) * ratio);
      const g = Math.round(68  + (146 - 68)  * ratio);
      const b = Math.round(68  + (8   - 68)  * ratio);
      return `rgba(${r},${g},${b},.85)`;
    });

    if (this.charts['zones']) {
      const c = this.charts['zones'];
      c.data.labels                      = labels;
      c.data.datasets[0].data            = data;
      c.data.datasets[0].backgroundColor = colors;
      c.update('active');
      return;
    }

    const ctx = this.zonesRef?.nativeElement?.getContext('2d');
    if (!ctx) return;

    this.charts['zones'] = new this.Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Signalements',
          data,
          backgroundColor: colors,
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: any) => ` ${ctx.raw} signalement(s)`,
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: { stepSize: 1, font: { size: 11 } },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 12 } },
          },
        },
        animation: { duration: 800, easing: 'easeInOutQuart' as const },
      },
    });
  }
}
