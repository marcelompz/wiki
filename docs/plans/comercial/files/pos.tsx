import { useState, useEffect } from "react";
import { 
  Row, Col, Card, Button, Input, List, Typography, Space, 
  Modal, Select, Radio, message, Tag, Badge, InputNumber 
} from "antd";
import { 
  ShoppingOutlined, DollarOutlined, 
  UserOutlined, DeleteOutlined, 
  PlusOutlined, MinusOutlined, 
  SaveOutlined 
} from "@ant-design/icons";
import { api } from "../../services/api";

const { Title, Text } = Typography;
const { Option } = Select;

export const POSPage = () => {
  const [activeMode, setActiveMode] = useState<"waiter" | "cashier">("waiter");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Waiter States
  const [cart, setCart] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>("Mesa 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState<string>("");
  const [sellers, setSellers] = useState<any[]>([]);

  useEffect(() => {
    loadSellers();
  }, []);

  const loadSellers = async () => {
    try {
      const response = await api.get('/api/v1/users', { params: { role: 'SELLER' } });
      setSellers(response.data || []);
    } catch (error) {
      console.error('Error loading sellers:', error);
    }
  };

  // Cashier States
  const [draftOrders, setDraftOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [discount, setDiscount] = useState<number>(0);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [paymentType, setPaymentType] = useState<string>("cash");

  useEffect(() => {
    loadProducts();
    if (activeMode === "cashier") {
      loadDraftOrders();
    }
  }, [activeMode]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/v1/products");
      setProducts(response.data);
    } catch (error) {
      message.error("Error al cargar productos");
    } finally {
      setLoading(false);
    }
  };

  const loadDraftOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/v1/orders?status=DRAFT");
      setDraftOrders(response.data);
    } catch (error) {
      message.error("Error al cargar mesas pendientes");
    } finally {
      setLoading(false);
    }
  };

  // Waiter Actions
  const addToCart = (product: any) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(
        cart.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(
        cart.map(item => 
          item.product.id === productId 
            ? { ...item, quantity: qty }
            : item
        )
      );
    }
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  };

  const handleSendComanda = async () => {
    if (cart.length === 0) {
      message.warning("El carrito está vacío");
      return;
    }
    try {
      const orderPayload = {
        customer_id: null,
        sellerId: selectedSellerId || undefined,
        trafficSource: 'pos_counter',
        lines: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price_at_sale: item.product.price,
          metadata: {}
        })),
        metadata: {
          table: selectedTable,
          waiterName: selectedSellerId ? `Vendedor ${selectedSellerId}` : "Mozo Staging",
          createdAt: new Date().toISOString()
        }
      };

      await api.post("/api/v1/orders", orderPayload);
      message.success(`Comanda enviada a cocina para ${selectedTable}`);
      setCart([]);
    } catch (error: any) {
      message.error(`Error al enviar comanda: ${error.response?.data?.message || error.message}`);
    }
  };

  // Cashier Actions
  const selectOrderForCheckout = (order: any) => {
    setSelectedOrder(order);
    setDiscount(0);
  };

  const getOrderTotal = () => {
    if (!selectedOrder) return 0;
    const itemsTotal = selectedOrder.orderLines.reduce(
      (sum: number, line: any) => sum + (Number(line.priceAtSale) * line.quantity), 
      0
    );
    return Math.max(0, itemsTotal - discount);
  };

  const handleProcessPayment = async () => {
    if (!selectedOrder) return;
    try {
      const confirmPayload = {
        paymentType,
        discountAmount: discount
      };

      await api.patch(`/api/v1/orders/${selectedOrder.id}/confirm`, confirmPayload);
      message.success(`Cobro procesado con éxito para ${selectedOrder.metadata?.table || "Pedido"}`);

      // Enviar el ticket al shell nativo de escritorio (si estamos embebidos
      // dentro del iframe de OmniFlow POS Desktop) para que lo imprima en la
      // impresora física. Si falla o no estamos en el shell, no afecta el
      // cobro: el pago ya quedó confirmado, solo se pierde el ticket impreso.
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage(
            {
              type: "omniflow:print-ticket",
              payload: {
                table: selectedOrder.metadata?.table,
                waiterName: selectedOrder.metadata?.waiterName,
                lines: selectedOrder.orderLines.map((line: any) => ({
                  name: line.product?.name || "Producto",
                  quantity: line.quantity,
                  price: Number(line.priceAtSale),
                })),
                total: getOrderTotal(),
                discount,
                paymentType,
              },
            },
            "*"
          );
        }
      } catch (printError) {
        console.error("No se pudo enviar el ticket a imprimir:", printError);
      }

      setPaymentModalVisible(false);
      setSelectedOrder(null);
      loadDraftOrders();
    } catch (error: any) {
      message.error(`Error al procesar cobro: ${error.response?.data?.message || error.message}`);
    }
  };

  // Filter products by search
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.skuInterno && p.skuInterno.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="admin-page" style={{ padding: "8px" }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Title level={2}>🏪 Terminal Punto de Venta (POS)</Title>
        </Col>
        <Col>
          <Radio.Group 
            value={activeMode} 
            onChange={(e) => setActiveMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="waiter">
              <ShoppingOutlined /> Modo Mozo (Comandas)
            </Radio.Button>
            <Radio.Button value="cashier">
              <DollarOutlined /> Modo Caja (Cobros)
            </Radio.Button>
          </Radio.Group>
        </Col>
      </Row>

      {activeMode === "waiter" ? (
        /* VISTA MOZO */
        <Row gutter={24}>
          <Col span={15}>
            <Card title="📦 Catálogo de Productos" extra={
              <Input.Search 
                placeholder="Buscar producto..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: 220 }}
              />
            }>
              <Row gutter={[12, 12]} style={{ maxHeight: "calc(100vh - 250px)", overflowY: "auto", padding: "4px" }}>
                {filteredProducts.map(product => (
                  <Col span={8} key={product.id}>
                    <Card
                      hoverable
                      onClick={() => addToCart(product)}
                      style={{ borderRadius: 8, border: "1px solid var(--border)" }}
                      bodyStyle={{ padding: 12 }}
                    >
                      <div style={{ fontWeight: "bold", fontSize: "14px", height: "40px", overflow: "hidden" }}>
                        {product.name}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <Tag style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }}>${Number(product.price).toLocaleString()}</Tag>
                        <Text type="secondary" style={{ fontSize: "11px" }}>Stock: {product.stockAvailable}</Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          <Col span={9}>
            <Card title="📝 Comanda en Curso" bodyStyle={{ padding: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <Text strong>Seleccionar Vendedor: </Text>
                <Select
                  value={selectedSellerId}
                  onChange={setSelectedSellerId}
                  style={{ width: "100%", marginTop: 8 }}
                  placeholder="Seleccionar vendedor"
                  allowClear
                >
                  {sellers.map((seller: any) => (
                    <Option key={seller.id} value={seller.id}>{seller.name || seller.email}</Option>
                  ))}
                </Select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <Text strong>Seleccionar Mesa: </Text>
                <Select 
                  value={selectedTable} 
                  onChange={setSelectedTable} 
                  style={{ width: "100%", marginTop: 8 }}
                >
                  {["Mesa 1", "Mesa 2", "Mesa 3", "Mesa 4", "Mesa 5", "Mesa 6", "Barra 1", "Barra 2"].map(table => (
                    <Option key={table} value={table}>{table}</Option>
                  ))}
                </Select>
              </div>

              <List
                header={<Text strong>Ítems</Text>}
                footer={
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 16, marginTop: 8 }}>
                    <span>Total:</span>
                    <span>${getCartTotal().toLocaleString()}</span>
                  </div>
                }
                bordered
                dataSource={cart}
                style={{ minHeight: "200px", maxHeight: "calc(100vh - 420px)", overflowY: "auto" }}
                renderItem={item => (
                  <List.Item actions={[
                    <Button 
                      size="small" 
                      shape="circle" 
                      icon={<MinusOutlined />} 
                      onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} 
                    />,
                    <span style={{ fontWeight: "bold" }}>{item.quantity}</span>,
                    <Button 
                      size="small" 
                      shape="circle" 
                      icon={<PlusOutlined />} 
                      onClick={() => addToCart(item.product)} 
                    />
                  ]}>
                    <List.Item.Meta
                      title={item.product.name}
                      description={`$${Number(item.product.price).toLocaleString()}`}
                    />
                  </List.Item>
                )}
              />

              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="large"
                block
                style={{ marginTop: 16, height: 48, borderRadius: 8 }}
                onClick={handleSendComanda}
              >
                Enviar Comanda a Cocina
              </Button>
            </Card>
          </Col>
        </Row>
      ) : (
        /* VISTA CAJERO */
        <Row gutter={24}>
          <Col span={14}>
            <Card title="🍽️ Mesas con Pedidos Activos (Sin Pagar)">
              <Row gutter={[16, 16]} style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
                {draftOrders.length === 0 ? (
                  <Col span={24} style={{ textAlign: "center", padding: 40 }}>
                    <Text type="secondary" style={{ fontSize: 16 }}>No hay mesas pendientes de cobro</Text>
                  </Col>
                ) : (
                  draftOrders.map(order => {
                    const isSelected = selectedOrder?.id === order.id;
                    return (
                      <Col span={8} key={order.id}>
                        <Card
                          hoverable
                          onClick={() => selectOrderForCheckout(order)}
                          style={{
                            borderRadius: 8,
                            border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                            background: isSelected ? "var(--menu-selected)" : "var(--bg-surface)"
                          }}
                          bodyStyle={{ padding: 16 }}
                        >
                          <Badge status="processing" text={
                            <Text strong style={{ fontSize: 16 }}>
                              {order.metadata?.table || "Mesa"}
                            </Text>
                          } />
                          <div style={{ marginTop: 8 }}>
                            <Text type="secondary">Artículos: {order.orderLines.length}</Text>
                          </div>
                          <div style={{ marginTop: 4, fontWeight: "bold", color: "var(--accent)" }}>
                            ${Number(order.totalAmount).toLocaleString()}
                          </div>
                        </Card>
                      </Col>
                    );
                  })
                )}
              </Row>
            </Card>
          </Col>

          <Col span={10}>
            <Card title={
              selectedOrder 
                ? `💳 Detalle de Cobro: ${selectedOrder.metadata?.table || "Mesa"}`
                : "💳 Detalle de Cobro"
            }>
              {selectedOrder ? (
                <div>
                  <List
                    bordered
                    dataSource={selectedOrder.orderLines}
                    style={{ maxHeight: "calc(100vh - 450px)", overflowY: "auto", marginBottom: 16 }}
                    renderItem={(line: any) => (
                      <List.Item>
                        <List.Item.Meta
                          title={line.product?.name || "Producto"}
                          description={`${line.quantity} x $${Number(line.priceAtSale).toLocaleString()}`}
                        />
                        <Text strong>${(Number(line.priceAtSale) * line.quantity).toLocaleString()}</Text>
                      </List.Item>
                    )}
                  />

                  <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <Text type="secondary">Subtotal:</Text>
                      <Text strong>${Number(selectedOrder.totalAmount).toLocaleString()}</Text>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignContent: "center", fontSize: 14 }}>
                      <Text type="secondary">Descuento ($):</Text>
                      <InputNumber 
                        min={0} 
                        value={discount} 
                        onChange={(val) => setDiscount(val || 0)} 
                        style={{ width: 120 }}
                      />
                    </div>

<div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: "bold", marginTop: 8 }}>
                      <Text strong style={{ fontSize: 18, color: "var(--text-primary)" }}>Total a Cobrar:</Text>
                      <span style={{ color: "var(--accent)" }}>${getOrderTotal().toLocaleString()}</span>
                    </div>
                  </div>

                  <Button
                    type="primary"
                    icon={<DollarOutlined />}
                    size="large"
                    block
                    style={{ marginTop: 24, height: 48, borderRadius: 8 }}
                    onClick={() => setPaymentModalVisible(true)}
                  >
                    Registrar Pago / Cerrar Mesa
                  </Button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: 40 }}>
                  <Text type="secondary">Selecciona una mesa activa para procesar el cobro</Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* MODAL DE METODO DE PAGO */}
      <Modal
        className="admin-modal-form"
        title="💵 Seleccione Método de Pago"
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        onOk={handleProcessPayment}
        okText="Confirmar Pago"
        cancelText="Cancelar"
        width={{ xs: '100%', sm: 600 }}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
      >
        <div style={{ padding: "12px 0", textAlign: "center" }}>
          <Radio.Group 
            value={paymentType} 
            onChange={(e) => setPaymentType(e.target.value)}
            style={{ width: "100%" }}
          >
            <Radio.Button value="cash" style={{ width: "33.3%", height: 60, lineHeight: "60px", fontSize: 16 }}>
              💵 Efectivo
            </Radio.Button>
            <Radio.Button value="card" style={{ width: "33.3%", height: 60, lineHeight: "60px", fontSize: 16 }}>
              💳 Tarjeta
            </Radio.Button>
            <Radio.Button value="transfer" style={{ width: "33.3%", height: 60, lineHeight: "60px", fontSize: 16 }}>
              🏦 Transferencia
            </Radio.Button>
          </Radio.Group>
        </div>
      </Modal>
    </div>
  );
};
