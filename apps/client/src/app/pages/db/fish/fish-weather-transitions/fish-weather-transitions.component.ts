import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LazyDataService } from 'apps/client/src/app/core/data/lazy-data.service';
import { mapIds } from 'apps/client/src/app/core/data/sources/map-ids';
import { weatherIndex } from 'apps/client/src/app/core/data/sources/weather-index';
import { SettingsService } from 'apps/client/src/app/modules/settings/settings.service';
import { combineLatest } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { FishContextService } from '../../service/fish-context.service';

@Component({
  selector: 'app-fish-weather-transitions',
  templateUrl: './fish-weather-transitions.component.html',
  styleUrls: ['./fish-weather-transitions.component.less', '../../common-db.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FishWeatherTransitionsComponent {
  public readonly loading$ = this.fishCtx.weatherTransitionsByFish$.pipe(map((res) => res.loading));

  public readonly weatherTransitions$ = combineLatest([this.fishCtx.weatherTransitionsByFish$, this.fishCtx.spotId$, this.lazyData.fishingSpots$]).pipe(
    map(([res, spotId, fishingSpots]) => {
      if (!res.data) return [];
      return Object.values(res.data.byId)
        .map((entry) => {
          let transitionChances: number | undefined;
          if (spotId !== undefined) {
            const spotData = fishingSpots.find((row) => row.id === spotId);
            const weatherChances = this.getWeatherChances(spotData.mapId, entry.toId);
            const previousWeatherChances = this.getWeatherChances(spotData.mapId, entry.fromId);
            transitionChances = 100 * weatherChances * previousWeatherChances;
          }
          return {
            ...entry,
            transitionChances,
            percent: 100 * (entry.occurrences / res.data.total),
          };
        })
        .sort((a, b) => b.percent - a.percent);
    }),
    startWith([])
  );

  constructor(private readonly lazyData: LazyDataService, public readonly settings: SettingsService, public readonly fishCtx: FishContextService) {}

  private getWeatherChances(mapId: number, weatherId: number): number {
    const index = weatherIndex[mapIds.find((m) => m.id === mapId).weatherRate];
    const maxRate = index[index.length - 1].rate;
    const matchingIndex = index.findIndex((row) => row.weatherId === weatherId);
    if (matchingIndex === -1) {
      return 0;
    }
    if (matchingIndex === 0) {
      return index[matchingIndex].rate / maxRate;
    }
    return (index[matchingIndex].rate - index[matchingIndex - 1].rate) / maxRate;
  }
}
