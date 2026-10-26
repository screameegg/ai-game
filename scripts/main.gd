extends Node2D

const TILE := 32
const MAP_W := 20
const MAP_H := 16

@onready var ground: Node2D = $Ground
@onready var water_layer: Node2D = $Water
@onready var props: Node2D = $Props
@onready var actors: Node2D = $Actors
@onready var ui: CanvasLayer = $UI
@onready var complete_label: Label = $UI/CompletePanel/Label
@onready var complete_panel: PanelContainer = $UI/CompletePanel
@onready var hint: Label = $UI/Hint

# 定稿：红球池内偏右；地图 20×16
var _pond_center := Vector2(15 * TILE, 8 * TILE)
var _pond_radius := 60.0

func _ready() -> void:
	complete_panel.visible = false
	hint.text = "WASD / 方向键移动 · 进池半速 · 触碰红球通关"
	_build_ground()
	_build_path()
	_build_pond()
	_build_props()
	_spawn_actors()

func _tex(path: String) -> Texture2D:
	return load(path) as Texture2D

func _sprite(parent: Node2D, tex: Texture2D, pos: Vector2, z: int = 0, foot_anchor: bool = false) -> Sprite2D:
	var s := Sprite2D.new()
	s.texture = tex
	s.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	s.centered = true
	if foot_anchor:
		s.offset = Vector2(0, -tex.get_height() / 2.0)
	s.position = pos
	s.z_index = z
	parent.add_child(s)
	return s

func _build_ground() -> void:
	var grass := _tex("res://art/grass.png")
	for y in range(MAP_H):
		for x in range(MAP_W):
			_sprite(ground, grass, Vector2(x * TILE + TILE / 2.0, y * TILE + TILE / 2.0), 0)

func _build_path() -> void:
	var dirt := _tex("res://art/dirt.png")
	var cells: Array[Vector2i] = []
	for y in range(2, 12):
		cells.append(Vector2i(4, y))
	for x in range(4, 10):
		cells.append(Vector2i(x, 11))
	for y in range(6, 12):
		cells.append(Vector2i(9, y))
	for x in range(9, 14):
		cells.append(Vector2i(x, 6))
	for y in range(6, 10):
		cells.append(Vector2i(13, y))
	for x in range(13, 15):
		cells.append(Vector2i(x, 9))
	var extra: Array[Vector2i] = []
	for c in cells:
		extra.append(c + Vector2i(1, 0))
		extra.append(c + Vector2i(0, 1))
	cells.append_array(extra)
	var seen := {}
	for c in cells:
		var key := str(c)
		if seen.has(key):
			continue
		seen[key] = true
		if c.x < 0 or c.y < 0 or c.x >= MAP_W or c.y >= MAP_H:
			continue
		var p := Vector2(c.x * TILE + TILE / 2.0, c.y * TILE + TILE / 2.0)
		if p.distance_to(_pond_center) < _pond_radius - 12:
			continue
		_sprite(ground, dirt, p, 1)

func _build_pond() -> void:
	var pond_tex := _tex("res://art/pond.png")
	_sprite(water_layer, pond_tex, _pond_center, 0)

	# 定稿：可进水减速，无岸边硬挡
	var area := Area2D.new()
	area.name = "WaterArea"
	area.collision_layer = 0
	area.collision_mask = 2
	area.monitoring = true
	area.position = _pond_center
	var cs := CollisionShape2D.new()
	var circle := CircleShape2D.new()
	circle.radius = _pond_radius - 10
	cs.shape = circle
	area.add_child(cs)
	area.set_script(load("res://scripts/water_area.gd"))
	water_layer.add_child(area)

func _build_props() -> void:
	var tree := _tex("res://art/tree.png")
	var tree2 := _tex("res://art/tree2.png")
	var post := _tex("res://art/post.png")
	var flower := _tex("res://art/flower.png")
	var bush := _tex("res://art/bush.png")

	var trees := [
		[Vector2(3 * TILE, 4 * TILE), tree],
		[Vector2(8 * TILE, 13 * TILE), tree2],
		[Vector2(12 * TILE, 3 * TILE), tree],
		[Vector2(17 * TILE, 12 * TILE), tree2],
	]
	for t in trees:
		_sprite(props, t[1], t[0], int(t[0].y), true)
		var body := StaticBody2D.new()
		body.position = t[0]
		body.collision_layer = 1
		var cs := CollisionShape2D.new()
		var circ := CircleShape2D.new()
		circ.radius = 8
		cs.shape = circ
		body.add_child(cs)
		props.add_child(body)

	var posts := [Vector2(5 * TILE, 8 * TILE), Vector2(11 * TILE, 7 * TILE), Vector2(14 * TILE, 11 * TILE)]
	for p in posts:
		_sprite(props, post, p, int(p.y), true)
		var body := StaticBody2D.new()
		body.position = p
		body.collision_layer = 1
		var cs := CollisionShape2D.new()
		var circ := CircleShape2D.new()
		circ.radius = 5
		cs.shape = circ
		body.add_child(cs)
		props.add_child(body)

	for i in range(10):
		var fp := Vector2((2 + (i * 5) % 16) * TILE + 8, (3 + (i * 4) % 11) * TILE + 10)
		if fp.distance_to(_pond_center) < _pond_radius + 20:
			continue
		_sprite(props, flower if i % 2 == 0 else bush, fp, 2)

func _spawn_actors() -> void:
	var wiz_tex := _tex("res://art/wizard.png")
	var slime_tex := _tex("res://art/slime.png")
	var ball_tex := _tex("res://art/red_ball.png")

	var player := CharacterBody2D.new()
	player.name = "Player"
	player.add_to_group("player")
	player.collision_layer = 2
	player.collision_mask = 1
	# 定稿：出生点土路西侧
	player.position = Vector2(5 * TILE, 10 * TILE)
	player.y_sort_enabled = true
	player.set_script(load("res://scripts/player.gd"))
	var ps := Sprite2D.new()
	ps.name = "Sprite"
	ps.texture = wiz_tex
	ps.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	ps.centered = true
	ps.offset = Vector2(0, -wiz_tex.get_height() / 2.0)
	player.add_child(ps)
	var pcs := CollisionShape2D.new()
	var pc := CircleShape2D.new()
	pc.radius = 7
	pcs.shape = pc
	pcs.position = Vector2(0, -2)
	player.add_child(pcs)
	actors.add_child(player)

	var cam := Camera2D.new()
	cam.enabled = true
	cam.zoom = Vector2(1.5, 1.5)
	cam.position_smoothing_enabled = true
	player.add_child(cam)

	var follower := CharacterBody2D.new()
	follower.name = "Follower"
	follower.collision_layer = 0
	follower.collision_mask = 1
	follower.position = player.position + Vector2(-24, 8)
	follower.y_sort_enabled = true
	follower.set_script(load("res://scripts/follower.gd"))
	var fs := Sprite2D.new()
	fs.texture = slime_tex
	fs.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	fs.centered = true
	fs.offset = Vector2(0, -slime_tex.get_height() / 2.0)
	follower.add_child(fs)
	var fcs := CollisionShape2D.new()
	var fc := CircleShape2D.new()
	fc.radius = 5
	fcs.shape = fc
	follower.add_child(fcs)
	actors.add_child(follower)
	follower.call("set_follow_target", player)

	var ball := Area2D.new()
	ball.name = "RedBall"
	ball.collision_layer = 4
	ball.collision_mask = 2
	ball.monitoring = true
	# 定稿：池内偏右
	ball.position = _pond_center + Vector2(24, -6)
	ball.set_script(load("res://scripts/red_ball.gd"))
	var bs := Sprite2D.new()
	bs.texture = ball_tex
	bs.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	bs.centered = true
	ball.add_child(bs)
	var bcs := CollisionShape2D.new()
	var bc := CircleShape2D.new()
	bc.radius = 10
	bcs.shape = bc
	ball.add_child(bcs)
	actors.add_child(ball)
	ball.level_complete.connect(_on_level_complete)

func _on_level_complete() -> void:
	complete_panel.visible = true
	complete_label.text = "第一关完成！"
	hint.text = "通关成功 · 可继续在场景里逛"
