import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ProjectData, RoomData } from '../utils/types';
import { format } from 'date-fns';

interface AnalyticsDashboardProps {
  projects: ProjectData[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ projects }) => {
  const COLORS = ['#00833D', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalProjects = projects.length;
    const totalRooms = projects.reduce((sum, p) => sum + p.rooms.length, 0);
    const totalEquipment = projects.reduce(
      (sum, p) =>
        sum + p.rooms.reduce((rsum, r) => rsum + (r.manuallyAddedEquipment?.length || 0), 0),
      0
    );

    // Projects by status (if you track status)
    const projectsByMonth = projects.reduce((acc, project) => {
      const month = format(new Date(project.createdAt), 'MMM yyyy');
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const monthlyData = Object.entries(projectsByMonth).map(([month, count]) => ({
      month,
      projects: count,
    }));

    // Room types distribution
    const roomTypes = projects
      .flatMap(p => p.rooms)
      .reduce((acc, room) => {
        const type = room.roomType || 'Unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const roomTypeData = Object.entries(roomTypes).map(([type, count]) => ({
      name: type,
      value: count,
    }));

    // Design tiers distribution
    const designTiers = projects
      .flatMap(p => p.rooms)
      .reduce((acc, room) => {
        const tier = room.designTier || 'Unknown';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const tierData = Object.entries(designTiers).map(([tier, count]) => ({
      name: tier,
      value: count,
    }));

    // Top equipment categories
    const categories = projects
      .flatMap(p => p.rooms)
      .flatMap(r => r.manuallyAddedEquipment || [])
      .reduce((acc, eq) => {
        const cat = eq.category || 'Misc';
        acc[cat] = (acc[cat] || 0) + eq.quantity;
        return acc;
      }, {} as Record<string, number>);

    const categoryData = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([category, count]) => ({
        category,
        count,
      }));

    // Average rooms per project
    const avgRoomsPerProject = totalProjects > 0 ? (totalRooms / totalProjects).toFixed(1) : '0';

    // Average equipment per room
    const avgEquipmentPerRoom = totalRooms > 0 ? (totalEquipment / totalRooms).toFixed(1) : '0';

    return {
      totalProjects,
      totalRooms,
      totalEquipment,
      monthlyData,
      roomTypeData,
      tierData,
      categoryData,
      avgRoomsPerProject,
      avgEquipmentPerRoom,
    };
  }, [projects]);

  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">No project data available for analytics.</p>
        <p className="text-sm text-text-secondary mt-2">Create some projects to see insights!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-background border border-border-color rounded-lg p-6">
          <p className="text-sm text-text-secondary">Total Projects</p>
          <p className="text-3xl font-bold text-accent mt-2">{analytics.totalProjects}</p>
        </div>
        <div className="bg-background border border-border-color rounded-lg p-6">
          <p className="text-sm text-text-secondary">Total Rooms</p>
          <p className="text-3xl font-bold text-accent mt-2">{analytics.totalRooms}</p>
        </div>
        <div className="bg-background border border-border-color rounded-lg p-6">
          <p className="text-sm text-text-secondary">Total Equipment</p>
          <p className="text-3xl font-bold text-accent mt-2">{analytics.totalEquipment}</p>
        </div>
        <div className="bg-background border border-border-color rounded-lg p-6">
          <p className="text-sm text-text-secondary">Avg Rooms/Project</p>
          <p className="text-3xl font-bold text-accent mt-2">{analytics.avgRoomsPerProject}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projects Over Time */}
        <div className="bg-background border border-border-color rounded-lg p-6">
          <h3 className="text-lg font-bold text-text-primary mb-4">Projects Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="projects"
                stroke="#00833D"
                strokeWidth={2}
                dot={{ fill: '#00833D', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Room Types Distribution */}
        <div className="bg-background border border-border-color rounded-lg p-6">
          <h3 className="text-lg font-bold text-text-primary mb-4">Room Types</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.roomTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#00833D"
                dataKey="value"
              >
                {analytics.roomTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Design Tiers */}
        <div className="bg-background border border-border-color rounded-lg p-6">
          <h3 className="text-lg font-bold text-text-primary mb-4">Design Tiers</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.tierData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="value" fill="#00833D" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Equipment Categories */}
        <div className="bg-background border border-border-color rounded-lg p-6">
          <h3 className="text-lg font-bold text-text-primary mb-4">Top Equipment Categories</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.categoryData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
              <XAxis type="number" stroke="#64748b" />
              <YAxis dataKey="category" type="category" width={100} stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="count" fill="#10b981" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-accent-bg-subtle border border-accent rounded-lg p-6">
        <h3 className="text-lg font-bold text-accent mb-3">💡 Insights</h3>
        <ul className="space-y-2 text-sm text-text-primary">
          <li>
            • You're averaging <strong>{analytics.avgRoomsPerProject} rooms per project</strong>
          </li>
          <li>
            • Each room contains an average of{' '}
            <strong>{analytics.avgEquipmentPerRoom} equipment items</strong>
          </li>
          {analytics.tierData[0] && (
            <li>
              • Most popular design tier:{' '}
              <strong className="text-accent">{analytics.tierData[0].name}</strong>
            </li>
          )}
          {analytics.roomTypeData[0] && (
            <li>
              • Most common room type:{' '}
              <strong className="text-accent">{analytics.roomTypeData[0].name}</strong>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
