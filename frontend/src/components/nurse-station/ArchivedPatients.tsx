import React from 'react';
import ArchivedPatientsPanel from '../shared/ArchivedPatientsPanel';

/** Страница архива (маршрут /archived) — тот же UI, что вкладка на станциях */
const ArchivedPatients: React.FC = () => (
  <ArchivedPatientsPanel allowRestore onRestored={() => {}} />
);

export default ArchivedPatients;
