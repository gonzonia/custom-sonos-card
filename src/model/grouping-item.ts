import { MediaPlayer } from './media-player';

export class GroupingItem {
  isSelected: boolean;
  icon!: string;
  isDisabled = false;
  isModified: boolean;
  readonly name: string;
  readonly isMain: boolean;
  readonly player: MediaPlayer;
  readonly currentlyJoined: boolean;

  constructor(player: MediaPlayer, activePlayer: MediaPlayer, isModified: boolean) {
    this.isMain = player.id === activePlayer.id;
    this.isModified = isModified;
    this.currentlyJoined = this.isMain || activePlayer.hasMember(player.id);
    this.isSelected = isModified ? !this.currentlyJoined : this.currentlyJoined;
    this.player = player;
    this.name = player.name;
    this.icon = this.isSelected ? 'check-circle' : 'checkbox-blank-circle-outline';
  }
}
