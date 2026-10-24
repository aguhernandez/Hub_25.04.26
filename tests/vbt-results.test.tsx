import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../src/contexts/ThemeContext',()=>({useTheme:()=>({isDark:true})}));
vi.mock('../src/contexts/LanguageContext',()=>({useLanguage:()=>({language:'es'})}));
vi.mock('../src/components/training/barvelocity/BarVelocityChart',()=>({default:()=> <div data-testid="sample-curve"/>}));
vi.mock('../src/components/training/barvelocity/VBTVelocityLossGraph',async importOriginal=>({
 ...await importOriginal<typeof import('../src/components/training/barvelocity/VBTVelocityLossGraph')>(), default:()=>null
}));
import Results from '../src/components/training/barvelocity/BarVelocityResultsPanel';
import {createManualRep} from '../src/components/training/barvelocity/BarSessionPersistence';
afterEach(cleanup);
it('4 UI: missing manual metrics are hidden, including expanded detail and sample curve',()=>{
 render(<Results reps={[createManualRep(1,.6)]} loadKg={80}/>);
 expect(screen.queryByText('Vel. pico (mejor rep)')).toBeNull();
 const buttons=screen.getAllByRole('button'); fireEvent.click(buttons[buttons.length-1]);
 expect(screen.queryByText('Concentrica')).toBeNull();
 expect(screen.queryByText('Excentrica')).toBeNull();
 expect(screen.queryByText('Desplaz.')).toBeNull();
 expect(screen.queryByTestId('sample-curve')).toBeNull();
});
