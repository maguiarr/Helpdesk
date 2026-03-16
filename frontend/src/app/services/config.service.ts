import { Injectable, signal } from '@angular/core';

export interface AppConfig {
  keycloakUrl: string;
  keycloakRealm: string;
  keycloakClientId: string;
  apiUrl: string;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private _keycloakUrl = signal('');
  private _keycloakRealm = signal('');
  private _keycloakClientId = signal('');
  private _apiUrl = signal('');

  readonly keycloakUrl = this._keycloakUrl.asReadonly();
  readonly keycloakRealm = this._keycloakRealm.asReadonly();
  readonly keycloakClientId = this._keycloakClientId.asReadonly();
  readonly apiUrl = this._apiUrl.asReadonly();

  async load(): Promise<void> {
    const response = await fetch('/assets/config.json');
    const config: AppConfig = await response.json();
    this._keycloakUrl.set(config.keycloakUrl);
    this._keycloakRealm.set(config.keycloakRealm);
    this._keycloakClientId.set(config.keycloakClientId);
    this._apiUrl.set(config.apiUrl);
  }
}
