import { AdminTable } from './AdminTable';
import { EntityType } from '@/lib/adminConfig';

interface ManagerTableProps {
  entity: EntityType;
}

/**
 * Компонент таблицы для панели менеджера.
 * Наследуется от AdminTable, но скрывает кнопки импорта/экспорта CSV.
 */
export const ManagerTable = ({ entity }: ManagerTableProps) => {
  return <AdminTable entity={entity} hideImportExport={true} />;
};

