# Star Flight Simulator

A 3D space flight simulator game built with Three.js and featuring Minecraft-style voxel graphics. Explore a vast universe, visit different planets, encounter satellites, and engage in combat with alien ships.

## Features

- Explore a universe filled with stars, planets, and satellites
- Minecraft-inspired voxel graphics for optimal performance
- Space physics-based flight mechanics
- Combat system with different weapon types
- Various enemy alien ships with AI behaviors
- Detailed spacecraft with realistic engine effects

## Demo

[View Live Demo](#) (Coming soon)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/star-flight-simulator.git
cd star-flight-simulator
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Game Controls

- **W/A/S/D**: Control the spacecraft's forward/backward movement and strafing
- **Mouse**: Aim and direct the spacecraft
- **Left Click**: Fire primary weapon (laser)
- **Right Click**: Fire secondary weapon (missile)
- **Space**: Boost/Afterburner
- **Shift**: Slow down/Brake
- **E**: Interact with objects (not implemented yet)
- **Tab**: View map (not implemented yet)
- **Escape**: Pause game

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Technologies Used

- **Three.js**: 3D rendering
- **JavaScript**: Programming language
- **Vite**: Build tool and development server
- **Cannon-es**: Physics engine
- **Howler.js**: Audio (not implemented yet)

## Project Structure

- `/src`: Source code
  - `/components`: Reusable game components
  - `/systems`: Core game systems (physics, rendering, etc.)
  - `/assets`: Game assets (textures, audio, etc.)
  - `/utils`: Utility functions
  - `/scenes`: Game scenes and levels
  - `/entities`: Game entity definitions

## Customization

You can customize various aspects of the game:

- Add new planet types in `src/entities/Planet.js`
- Create new spacecraft designs in `src/entities/Spacecraft.js`
- Add new enemy types in `src/entities/AlienShip.js`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by classic space games and Minecraft's visual style
- Built with Three.js - a fantastic 3D library for the web 