import { Product } from '../../utils/types';

export const ACCESSORIES: Product[] = [
    {
        sku: 'SR-1G-MM-SFP',
        name: 'Short Range | 1 Gigabit | Multi Mode | SFP module',
        category: 'Accessory',
        description: 'Short Range | 1 Gigabit | Multi Mode | SFP module for fiber connections.',
        tags: ['SFP', 'Fiber', '1G'],
    },
    {
        sku: 'SR-10G-MM-SFPP',
        name: 'Short Range | 10 Gigabit | Multi Mode| SFP Plus module',
        category: 'Accessory',
        description: 'Short Range | 10 Gigabit | Multi Mode| SFP Plus module for high-speed fiber connections.',
        tags: ['SFP', 'Fiber', '10G'],
    },
    {
        sku: 'EXP-USB3-HUB4',
        name: 'WyreStorm 4-Port USB 3.0 Hub',
        category: 'Accessory',
        description: '4-Port USB 3.0 Hub for expanding device connectivity at endpoints. Supports high-bandwidth peripherals like 4K cameras.',
        tags: ['USB', 'Hub', 'USB3.0', 'Accessory'],
        usb: { ports: [{ type: 'USB-A', count: 4 }], bandwidth: '3.0' }
    },
];