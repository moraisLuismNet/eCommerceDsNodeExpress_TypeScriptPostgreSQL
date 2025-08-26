import { Order } from './Order';
import { OrderDetail } from './OrderDetail';

// Define associations
export function setupAssociations() {
    // Order has many OrderDetails
    Order.hasMany(OrderDetail, {
        foreignKey: 'OrderId',
        as: 'OrderDetails',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });

    // OrderDetail belongs to Order
    OrderDetail.belongsTo(Order, {
        foreignKey: 'OrderId',
        as: 'Order'
    });

    console.log('Model associations have been set up');
}
