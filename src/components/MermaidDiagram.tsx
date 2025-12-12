import React, { useEffect, useRef } from 'react';

declare const mermaid: any;

interface MermaidDiagramProps {
  definition: string;
  onNodeClick?: (nodeId: string) => void;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ definition, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && definition) {
      containerRef.current.innerHTML = '';
      
      try {
        // Resolve CSS variables to actual color values
        const styles = getComputedStyle(document.documentElement);
        const themeVariables = {
            background: styles.getPropertyValue('--background').trim(),
            primaryColor: styles.getPropertyValue('--background-secondary').trim(),
            primaryTextColor: styles.getPropertyValue('--text-primary').trim(),
            lineColor: styles.getPropertyValue('--text-secondary').trim(),
            textColor: styles.getPropertyValue('--text-primary').trim(),
        };
        
        mermaid.initialize({ 
            startOnLoad: false, 
            theme: 'neutral',
            securityLevel: 'antiscript', // Allow basic HTML but sanitize scripts to prevent XSS
            flowchart: {
              htmlLabels: true // Enable HTML in node labels
            },
            themeVariables
        });

        const graphId = `mermaid-graph-${Math.random().toString(36).substring(2, 9)}`;
        mermaid.render(graphId, definition, (svgGraph: string) => {
            if (containerRef.current) {
                containerRef.current.innerHTML = svgGraph;
            }
        });
      } catch (e) {
        console.error('Mermaid render error:', e);
        if (containerRef.current) {
            containerRef.current.innerHTML = `<p class="text-destructive">Error rendering diagram.</p>`;
        }
      }
    }
  }, [definition]);

  return (
    <div 
        className="p-4 bg-background border border-border-color rounded-md flex justify-center items-center w-full h-full"
        onClick={() => onNodeClick && onNodeClick('mock-node-id')}
        style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
    >
      <div ref={containerRef} className="w-full h-full flex justify-center items-center" />
    </div>
  );
};

export default MermaidDiagram;