import { useMemo } from 'react';
import { Material, Movimentacao, Notification } from '../types';

const LOW_STOCK_THRESHOLD = 20;
const STALE_STOCK_DAYS = 90;

const useNotifications = (materials: Material[], movements: Movimentacao[]): Notification[] => {
  const notifications = useMemo(() => {
    const allNotifications: Notification[] = [];
    const today = new Date();
    
    // Create a map for last movement date of each material
    const lastMovementMap = new Map<string, string>();
    movements.forEach(mov => {
        const materialName = mov.material;
        if (!lastMovementMap.has(materialName) || new Date(mov.data) > new Date(lastMovementMap.get(materialName)!)) {
            lastMovementMap.set(materialName, mov.data);
        }
    });

    materials.forEach(material => {
      // 1. Check for low stock
      if (material.quantidade > 0 && material.quantidade < LOW_STOCK_THRESHOLD) {
        allNotifications.push({
          id: `low-${material.id}`,
          type: 'low_stock',
          message: `Estoque baixo para ${material.nome} (${material.quantidade} unidades restantes).`,
          date: today.toISOString(),
          materialId: material.id,
        });
      }

      // 2. Check for zero stock
      if (material.quantidade <= 0) {
        allNotifications.push({
          id: `zero-${material.id}`,
          type: 'zero_stock',
          message: `Estoque zerado para ${material.nome}. Considere fazer um novo pedido.`,
          date: today.toISOString(),
          materialId: material.id,
        });
      }
      
      // 3. Check for stale stock
      const lastMoveDateStr = lastMovementMap.get(material.nome);
      if (lastMoveDateStr) {
          const lastMoveDate = new Date(lastMoveDateStr);
          const diffTime = Math.abs(today.getTime() - lastMoveDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > STALE_STOCK_DAYS && material.quantidade > 0) {
              allNotifications.push({
                  id: `stale-${material.id}`,
                  type: 'stale_stock',
                  message: `${material.nome} não é movimentado há ${diffDays} dias.`,
                  date: today.toISOString(),
                  materialId: material.id,
              });
          }
      }
    });

    return allNotifications.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [materials, movements]);

  return notifications;
};

export default useNotifications;
