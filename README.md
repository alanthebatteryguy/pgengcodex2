# Parking Garage Optimization Engine

## Setup Instructions

1. **Configure Environment Variables**
   Create a `.env.local` file in the root directory with your Convex URL:
   ```
   VITE_CONVEX_URL=https://your-project.convex.cloud
   ```
   (This should have been created when you ran `npx convex dev`)

2. **Install Dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Run the Application**
   Open two terminals:
   
   Terminal 1 - Convex Backend:
   ```bash
   npm run convex:dev
   ```
   
   Terminal 2 - React Frontend:
   ```bash
   npm run dev
   ```

4. **Access the Application**
   Open http://localhost:5173 in your browser

## Using the Application

1. **Project Parameters**: Enter your garage dimensions and site conditions
2. **Cost Data**: Input your regional construction costs
3. **Results**: View optimized designs for three structural systems

## Default Cost Values Needed

When you reach the cost input screen, you'll need to provide:

- **PT Slab Costs** ($/SF for each thickness 3"-12")
  - Typical: $12-25/SF depending on thickness
  - 3-7" for spans < 32'
  - 9-12" for spans 45-55'

- **PT Formwork**: $3-6/SF typical
- **PT Strand**: $1.50-2.50/LB installed
- **Beam Forming**: $50-100/CF
- **Beam Pouring**: $150-250/CF

## Features

- Optimizes between flat plate, one-way beam, and two-way beam systems
- Checks all ACI 318-19 limit states:
  - Moment capacity
  - Deflection (L/480 for parking)
  - Vibration (8 Hz minimum)
  - Punching shear for wheel loads
  - Camber limits
- Compares costs across multiple spans (18'-60')
- Real-time optimization with visual results