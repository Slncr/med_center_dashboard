import React from 'react';
import './BedSchematic.css';

type FlagColor = 'white' | 'yellow' | 'orange' | 'red' | 'green';

interface BedSchematicProps {
  occupied: boolean;
  bedNumber: number | string;
  flags?: {
    leftTop?: FlagColor;
    leftBottom?: FlagColor;
    rightTop?: FlagColor;
    rightBottom?: FlagColor;
  };
}

type FlagSlot = 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom';

const FLAG_SLOTS: FlagSlot[] = ['leftTop', 'leftBottom', 'rightTop', 'rightBottom'];

const img = (name: string) => `${process.env.PUBLIC_URL}/images/${name}`;

const BedSchematic: React.FC<BedSchematicProps> = ({ occupied, bedNumber, flags }) => {
  const resolved = {
    leftTop: flags?.leftTop ?? 'white',
    leftBottom: flags?.leftBottom ?? 'white',
    rightTop: flags?.rightTop ?? 'white',
    rightBottom: flags?.rightBottom ?? 'white',
  };

  return (
    <div className={`bed-schematic ${occupied ? 'occupied' : 'free'}`}>
      <div
        className="bed-schematic-canvas"
        role="img"
        aria-label={occupied ? `Койка ${bedNumber}, занята` : `Койка ${bedNumber}, свободна`}
      >
        <img className="bed-schematic-bed" src={img('bed-schematic-bed.png')} alt="" draggable={false} />

        {occupied && (
          <img
            className="bed-schematic-patient"
            src={img('bed-schematic-patient.png')}
            alt=""
            draggable={false}
          />
        )}

        {FLAG_SLOTS.map((slot) => (
          <div key={slot} className={`bed-flag-slot bed-flag-slot--${slot}`}>
            <span className={`bed-flag-pill ${resolved[slot]}`} aria-hidden />
          </div>
        ))}
      </div>
      <div className="bed-schematic-caption">Койка {bedNumber}</div>
    </div>
  );
};

export default BedSchematic;
