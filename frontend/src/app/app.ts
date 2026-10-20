import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** The root: each route brings its own layout (the sign-in screens or the signed-in shell). */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
