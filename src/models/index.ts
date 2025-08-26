import { sequelize } from '../config/database';

// Import model setup functions
import { setupGroupAssociations } from './Group';
import { setupMusicGenreAssociations } from './MusicGenre';
import { setupUserAssociations } from './User';

// Import all models
import { Group } from './Group';
import { MusicGenre } from './MusicGenre';
import User from './User';

// Re-export all models and types
export { Group, MusicGenre };
export { default as User } from './User';
export type { IUserAttributes, UserCreationAttributes } from './User';

// Setup all associations
export function setupAssociations() {
    // Setup model associations
    setupUserAssociations();
    setupGroupAssociations();
    setupMusicGenreAssociations();
}

// Export the sequelize instance to be used throughout the application
export { sequelize };
