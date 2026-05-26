import { Component, input, output, ElementRef, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Token } from '../services/types';
import { TokenStateService } from '../services/token-state.service';

type SortableColumn = 'symbol' | 'price' | 'volume' | 'liquidityDepth' | 'yield';

@Component({
  selector: 'app-market-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40">
      <table class="w-full text-left text-sm font-mono">
        <thead class="bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs border-b border-slate-200 dark:border-slate-800">
          <tr>
            <th class="px-4 py-3">
               <button (click)="handleSort('symbol')" class="flex items-center gap-1 group transition-colors hover:text-slate-900 dark:hover:text-slate-200">
                <span>Asset</span>
                <span class="opacity-30 group-hover:opacity-100" [class.!opacity-100]="sortColumn() === 'symbol'">
                  @if (sortColumn() === 'symbol') {
                    @if (sortDirection() === 'asc') {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg>
                    } @else {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    }
                  } @else {
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3zM5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>
                  }
                </span>
              </button>
            </th>
            <th class="px-4 py-3 text-right">
              <button (click)="handleSort('price')" class="flex items-center gap-1 group transition-colors hover:text-slate-900 dark:hover:text-slate-200 ml-auto">
                <span>Price</span>
                <span class="opacity-30 group-hover:opacity-100" [class.!opacity-100]="sortColumn() === 'price'">
                   @if (sortColumn() === 'price') {
                    @if (sortDirection() === 'asc') {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg>
                    } @else {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    }
                  } @else {
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3zM5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>
                  }
                </span>
              </button>
            </th>
            <th class="px-4 py-3 text-right">
              <button (click)="handleSort('volume')" class="flex items-center gap-1 group transition-colors hover:text-slate-900 dark:hover:text-slate-200 ml-auto">
                <span>Volume (24h)</span>
                 <span class="opacity-30 group-hover:opacity-100" [class.!opacity-100]="sortColumn() === 'volume'">
                   @if (sortColumn() === 'volume') {
                    @if (sortDirection() === 'asc') {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg>
                    } @else {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    }
                  } @else {
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3zM5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>
                  }
                </span>
              </button>
            </th>
            <th class="px-4 py-3 text-right">
              <button (click)="handleSort('liquidityDepth')" class="flex items-center gap-1 group transition-colors hover:text-slate-900 dark:hover:text-slate-200 ml-auto">
                <span>Liq. Depth</span>
                 <span class="opacity-30 group-hover:opacity-100" [class.!opacity-100]="sortColumn() === 'liquidityDepth'">
                   @if (sortColumn() === 'liquidityDepth') {
                    @if (sortDirection() === 'asc') {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg>
                    } @else {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    }
                  } @else {
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3zM5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>
                  }
                </span>
              </button>
            </th>
            <th class="px-4 py-3 text-right">
              <button (click)="handleSort('yield')" class="flex items-center gap-1 group transition-colors hover:text-slate-900 dark:hover:text-slate-200 ml-auto">
                <span>Yield</span>
                <span class="opacity-30 group-hover:opacity-100" [class.!opacity-100]="sortColumn() === 'yield'">
                  @if (sortColumn() === 'yield') {
                    @if (sortDirection() === 'asc') {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"/></svg>
                    } @else {
                      <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                    }
                  } @else {
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.5a.75.75 0 01-1.5 0V3.75A.75.75 0 0110 3zM5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clip-rule="evenodd" /></svg>
                  }
                </span>
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          @for (token of sortedTokens(); track token.symbol) {
            <tr 
              class="group transition-colors border-l-2 cursor-grab"
              [draggable]="true"
              (dragstart)="onDragStart($event, token.symbol)"
              (dragend)="onDragEnd($event)"
              (dragover)="onDragOver($event)"
              (drop)="onDrop($event, token.symbol)"
              (dragenter)="onDragEnter($event)"
              (dragleave)="onDragLeave($event)"
              [class.border-green-500]="selectedSymbol() === token.symbol"
              [class.dark:border-teal-400]="selectedSymbol() === token.symbol"
              [class.border-transparent]="selectedSymbol() !== token.symbol"
              [class.bg-slate-100]="selectedSymbol() === token.symbol"
              [class.dark:bg-slate-800]="selectedSymbol() === token.symbol"
              [class.hover:bg-slate-50]="selectedSymbol() !== token.symbol"
              [class.dark:hover:bg-slate-800/50]="selectedSymbol() !== token.symbol"
            >
              <td class="px-4 py-3 font-medium">
                <div class="flex items-center gap-3">
                  <!-- Token Image with Placeholder Fallback -->
                  @if (token.imageUrl && !imageErrors().has(token.symbol)) {
                    <img 
                      [src]="token.imageUrl" 
                      (error)="handleImageError(token.symbol)" 
                      alt="{{token.symbol}} logo" 
                      class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 object-cover"
                    >
                  } @else {
                    <div class="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                      {{ token.symbol[0] }}
                    </div>
                  }
                  <div 
                    class="cursor-pointer hover:text-green-600 dark:hover:text-teal-400 transition-colors" 
                    (click)="onRowClick(token.symbol)"
                  >
                    <span class="text-green-600 dark:text-teal-400" [class.underline]="selectedSymbol() === token.symbol">{{ token.symbol }}</span>
                    <span class="text-slate-500 dark:text-slate-400 text-xs hidden sm:inline ml-2">{{ token.name }}</span>
                  </div>
                </div>
              </td>
              <td 
                class="px-4 py-3 text-right text-slate-800 dark:text-slate-200 dark:group-hover:text-white cursor-default tabular-nums transition-colors price-cell"
                [class.price-up]="lastPriceUpdate()?.symbol === token.symbol && lastPriceUpdate()?.direction === 'up'"
                [class.price-down]="lastPriceUpdate()?.symbol === token.symbol && lastPriceUpdate()?.direction === 'down'"
              >
                \${{ token.price | number:'1.2-6' }}
              </td>
              <td class="px-4 py-3 text-right text-slate-600 dark:text-slate-300 dark:group-hover:text-slate-100 cursor-default tabular-nums transition-colors">
                {{ token.volume | number:'1.0-0' }}
              </td>
              <td class="px-4 py-3 text-right text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-200 cursor-default tabular-nums transition-colors">
                <span 
                  class="transition-colors"
                  [class.text-red-500]="token.liquidityDepth < 1000000" 
                  [class.dark:text-red-400]="token.liquidityDepth < 1000000"
                  [class.dark:group-hover:!text-red-300]="token.liquidityDepth < 1000000"
                >
                  \${{ (token.liquidityDepth / 1000000) | number:'1.1-1' }}M
                </span>
              </td>
              <td class="px-4 py-3 text-right text-slate-500 dark:text-slate-400 dark:group-hover:text-slate-200 cursor-default tabular-nums transition-colors">
                {{ token.yield | number:'1.2-2' }}%
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `
})
export class MarketGridComponent {
  tokens = input.required<Token[]>();
  selectedSymbol = input<string | null>(null);
  select = output<string>();
  reorder = output<{ fromSymbol: string; toSymbol: string }>();

  private elementRef = inject(ElementRef);
  private stateService = inject(TokenStateService);
  private draggedSymbol: string | null = null;
  
  // --- Image Error State ---
  imageErrors = signal<Set<string>>(new Set());

  // --- Sorting State ---
  sortColumn = signal<SortableColumn>('volume');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Expose the signal for template binding
  lastPriceUpdate = this.stateService.lastPriceUpdate;

  // --- Computed Sorted Data ---
  sortedTokens = computed(() => {
    const tokensToSort = [...this.tokens()];
    const column = this.sortColumn();
    const direction = this.sortDirection();

    if (!column) {
      return tokensToSort;
    }

    tokensToSort.sort((a, b) => {
      const valA = a[column];
      const valB = b[column];

      let comparison = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      }

      return direction === 'asc' ? comparison : -comparison;
    });

    return tokensToSort;
  });

  handleImageError(symbol: string) {
    this.imageErrors.update(current => {
      const newSet = new Set(current);
      newSet.add(symbol);
      return newSet;
    });
  }

  handleSort(column: SortableColumn) {
    if (this.sortColumn() === column) {
      this.sortDirection.update(dir => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set(column === 'symbol' ? 'asc' : 'desc');
    }
  }

  onRowClick(symbol: string) {
    this.select.emit(symbol);
  }

  // --- Drag and Drop Handlers ---

  onDragStart(event: DragEvent, symbol: string) {
    this.draggedSymbol = symbol;
    const target = event.target as HTMLElement;
    target.classList.add('dragging-item');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // Necessary to allow dropping
  }

  onDragEnter(event: DragEvent) {
    const target = (event.currentTarget as HTMLElement);
    if (target && this.draggedSymbol) {
      target.classList.add('drag-over-indicator');
    }
  }

  onDragLeave(event: DragEvent) {
    (event.currentTarget as HTMLElement).classList.remove('drag-over-indicator');
  }
  
  onDrop(event: DragEvent, toSymbol: string) {
    event.preventDefault();
    if (this.draggedSymbol && this.draggedSymbol !== toSymbol) {
      this.reorder.emit({ fromSymbol: this.draggedSymbol, toSymbol });
    }
    this.cleanupDragStyles();
  }

  onDragEnd() {
    this.cleanupDragStyles();
  }

  private cleanupDragStyles() {
    this.draggedSymbol = null;
    const nativeEl = this.elementRef.nativeElement;
    nativeEl.querySelectorAll('.dragging-item').forEach((el: HTMLElement) => el.classList.remove('dragging-item'));
    nativeEl.querySelectorAll('.drag-over-indicator').forEach((el: HTMLElement) => el.classList.remove('drag-over-indicator'));
  }
}